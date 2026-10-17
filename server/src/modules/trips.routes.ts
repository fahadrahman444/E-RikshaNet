import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { haversineDistanceKm, calculateEstimatedFare, isPointInPolygon } from "../utils/geofence.js";
import { Role, TripStatus, PermitStatus } from "../types/enums.js";
import { Server as SocketIOServer } from "socket.io";

export function createTripsRouter(io: SocketIOServer) {
  const router = Router();

  // Fare estimation endpoint (FR-25)
  const estimateSchema = z.object({
    pickupLat: z.number(),
    pickupLng: z.number(),
    dropoffLat: z.number(),
    dropoffLng: z.number(),
  });

  router.post("/estimate", async (req: Request, res: Response): Promise<void> => {
    try {
      const { pickupLat, pickupLng, dropoffLat, dropoffLng } = estimateSchema.parse(req.body);

      const distanceKm = haversineDistanceKm(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng }
      );

      const estimatedFare = calculateEstimatedFare(distanceKm);

      res.json({
        distanceKm: Number(distanceKm.toFixed(2)),
        estimatedFare,
        currency: "BDT",
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to estimate fare" });
    }
  });

  // Passenger: Request a ride (FR-24, FR-26)
  const requestTripSchema = z.object({
    zoneId: z.string(),
    pickupLat: z.number(),
    pickupLng: z.number(),
    pickupAddress: z.string().min(2),
    dropoffLat: z.number(),
    dropoffLng: z.number(),
    dropoffAddress: z.string().min(2),
  });

  router.post(
    "/request",
    authenticate,
    authorizeRoles(Role.PASSENGER),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const data = requestTripSchema.parse(req.body);

        const zone = await prisma.operatingZone.findUnique({ where: { id: data.zoneId } });
        if (!zone || !zone.isActive) {
          res.status(400).json({ error: "Invalid or inactive operating zone" });
          return;
        }

        // Verify pickup is within operating zone
        const zoneCoords = JSON.parse(zone.polygonGeoJson);
        const isPickupInside = isPointInPolygon(
          { lat: data.pickupLat, lng: data.pickupLng },
          zoneCoords
        );

        if (!isPickupInside) {
          res.status(400).json({
            error: "Pickup location must be within the designated local ward boundary.",
          });
          return;
        }

        const distanceKm = haversineDistanceKm(
          { lat: data.pickupLat, lng: data.pickupLng },
          { lat: data.dropoffLat, lng: data.dropoffLng }
        );
        const estimatedFare = calculateEstimatedFare(distanceKm);
        const tripNumber = `TRIP-${Date.now().toString().slice(-6)}`;

        const trip = await prisma.trip.create({
          data: {
            tripNumber,
            passengerId: req.user!.id,
            zoneId: data.zoneId,
            pickupLat: data.pickupLat,
            pickupLng: data.pickupLng,
            pickupAddress: data.pickupAddress,
            dropoffLat: data.dropoffLat,
            dropoffLng: data.dropoffLng,
            dropoffAddress: data.dropoffAddress,
            estimatedFare,
            status: TripStatus.REQUESTED,
          },
          include: { zone: true, passenger: { select: { name: true, phone: true } } },
        });

        // Broadcast new ride to all on-duty drivers in this zone
        io.to(`zone:${data.zoneId}`).emit("trip:new_request", trip);

        res.status(201).json({ message: "Trip requested successfully", trip });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.errors });
          return;
        }
        console.error("Trip request error:", err);
        res.status(500).json({ error: "Failed to request trip" });
      }
    }
  );

  // Driver: List available trips in driver's permitted zone (FR-26, BR-04)
  router.get(
    "/available",
    authenticate,
    authorizeRoles(Role.DRIVER),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const driver = await prisma.driverProfile.findUnique({
          where: { userId: req.user!.id },
          include: {
            permits: { where: { status: PermitStatus.ACTIVE } },
          },
        });

        if (!driver || !driver.isOnDuty) {
          res.status(403).json({ error: "Driver must be online/on-duty to view available trips" });
          return;
        }

        const permittedZoneIds = driver.permits.map((p) => p.zoneId);

        const availableTrips = await prisma.trip.findMany({
          where: {
            status: TripStatus.REQUESTED,
            zoneId: { in: permittedZoneIds },
          },
          include: {
            passenger: { select: { name: true, phone: true } },
            zone: true,
          },
          orderBy: { createdAt: "desc" },
        });

        res.json({ trips: availableTrips });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch available trips" });
      }
    }
  );

  // Driver: Accept trip (FR-27)
  router.post(
    "/:id/accept",
    authenticate,
    authorizeRoles(Role.DRIVER),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;

        const driver = await prisma.driverProfile.findUnique({
          where: { userId: req.user!.id },
          include: {
            permits: { where: { status: PermitStatus.ACTIVE } },
          },
        });

        if (!driver || !driver.isOnDuty) {
          res.status(403).json({ error: "Must be on duty to accept trips" });
          return;
        }

        const trip = await prisma.trip.findUnique({ where: { id } });
        if (!trip || trip.status !== TripStatus.REQUESTED) {
          res.status(409).json({ error: "Trip is no longer available" });
          return;
        }

        // Check driver holds active permit for this zone (BR-02, BR-04)
        const hasPermit = driver.permits.some((p) => p.zoneId === trip.zoneId);
        if (!hasPermit) {
          res.status(403).json({
            error: "You do not have an active operating permit for this ward/zone.",
          });
          return;
        }

        const updatedTrip = await prisma.trip.update({
          where: { id },
          data: {
            driverId: driver.id,
            vehicleId: driver.currentVehicleId,
            status: TripStatus.ACCEPTED,
          },
          include: {
            driver: { include: { user: { select: { name: true, phone: true } } } },
            vehicle: true,
            passenger: { select: { id: true, name: true, phone: true } },
          },
        });

        // Notify passenger via socket
        io.to(`passenger:${trip.passengerId}`).emit("trip:accepted", updatedTrip);

        res.json({ message: "Trip accepted", trip: updatedTrip });
      } catch (err) {
        res.status(500).json({ error: "Failed to accept trip" });
      }
    }
  );

  // Update trip status: ARRIVING -> IN_PROGRESS -> COMPLETED / CANCELLED (FR-28)
  const statusUpdateSchema = z.object({
    status: z.nativeEnum(TripStatus),
    cancellationReason: z.string().optional(),
    finalFare: z.number().optional(),
  });

  router.patch(
    "/:id/status",
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const { status, cancellationReason, finalFare } = statusUpdateSchema.parse(req.body);

        const trip = await prisma.trip.findUnique({ where: { id } });
        if (!trip) {
          res.status(404).json({ error: "Trip not found" });
          return;
        }

        const dataToUpdate: any = { status };
        if (status === TripStatus.IN_PROGRESS && !trip.startedAt) {
          dataToUpdate.startedAt = new Date();
        }
        if (status === TripStatus.COMPLETED) {
          dataToUpdate.completedAt = new Date();
          dataToUpdate.finalFare = finalFare || trip.estimatedFare;
        }
        if (status === TripStatus.CANCELLED) {
          dataToUpdate.cancellationReason = cancellationReason || "Cancelled by user";
          dataToUpdate.cancelledBy = req.user!.name;
        }

        const updated = await prisma.trip.update({
          where: { id },
          data: dataToUpdate,
          include: {
            passenger: { select: { name: true, phone: true } },
            driver: { include: { user: { select: { name: true, phone: true } } } },
          },
        });

        // Broadcast status update
        io.to(`trip:${id}`).emit("trip:status_change", updated);

        res.json({ message: `Trip status updated to ${status}`, trip: updated });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.errors });
          return;
        }
        res.status(500).json({ error: "Failed to update trip status" });
      }
    }
  );

  // Current or historical trips for authenticated user (FR-29)
  router.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      let whereClause: any = {};
      if (req.user!.role === Role.PASSENGER) {
        whereClause.passengerId = req.user!.id;
      } else if (req.user!.role === Role.DRIVER) {
        const driver = await prisma.driverProfile.findUnique({ where: { userId: req.user!.id } });
        if (!driver) {
          res.json({ trips: [] });
          return;
        }
        whereClause.driverId = driver.id;
      }

      const trips = await prisma.trip.findMany({
        where: whereClause,
        include: {
          zone: true,
          passenger: { select: { name: true, phone: true } },
          driver: { include: { user: { select: { name: true, phone: true } } } },
          vehicle: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ trips });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user trips" });
    }
  });

  return router;
}
