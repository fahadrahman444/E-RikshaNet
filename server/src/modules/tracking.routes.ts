import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { isPointInPolygon } from "../utils/geofence.js";
import { Role, ViolationCategory, ViolationStatus, PermitStatus } from "../types/enums.js";
import { Server as SocketIOServer } from "socket.io";

export function createTrackingRouter(io: SocketIOServer) {
  const router = Router();

  const pingSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracyMeters: z.number().optional(),
    speedKmh: z.number().optional(),
    heading: z.number().optional(),
    recordedAt: z.string().datetime().optional(),
  });

  // Driver submits location ping (FR-13)
  router.post(
    "/ping",
    authenticate,
    authorizeRoles(Role.DRIVER),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const data = pingSchema.parse(req.body);
        const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();

        const driver = await prisma.driverProfile.findUnique({
          where: { userId: req.user!.id },
          include: {
            permits: {
              where: { status: PermitStatus.ACTIVE },
              include: { zone: true },
            },
          },
        });

        if (!driver || !driver.isOnDuty) {
          res.status(400).json({ error: "Driver is not marked as on-duty." });
          return;
        }

        // Check if inside any of driver's active permitted zones
        let isInsidePermittedZone = false;
        let activePermitZone = driver.permits[0]?.zone;

        if (activePermitZone) {
          try {
            const polygonCoords = JSON.parse(activePermitZone.polygonGeoJson);
            isInsidePermittedZone = isPointInPolygon(
              { lat: data.latitude, lng: data.longitude },
              polygonCoords
            );
          } catch (e) {
            console.error("Error parsing zone polygon GeoJSON:", e);
          }
        }

        // Store location report (FR-17)
        const report = await prisma.locationReport.create({
          data: {
            driverId: driver.id,
            vehicleId: driver.currentVehicleId,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracyMeters: data.accuracyMeters,
            speedKmh: data.speedKmh,
            heading: data.heading,
            isInsideZone: isInsidePermittedZone,
            recordedAt,
          },
        });

        // Update driver's last known location
        await prisma.driverProfile.update({
          where: { id: driver.id },
          data: {
            lastLatitude: data.latitude,
            lastLongitude: data.longitude,
            lastPingAt: new Date(),
          },
        });

        // FR-16 & BR-06: Flag candidate breach for human review if outside permitted zone
        if (!isInsidePermittedZone && activePermitZone) {
          // Check if an existing open candidate review already exists recently
          const recentCase = await prisma.violationCase.findFirst({
            where: {
              driverId: driver.id,
              category: ViolationCategory.GEOFENCE_BREACH,
              status: ViolationStatus.CANDIDATE_REVIEW,
            },
          });

          if (!recentCase) {
            const caseNumber = `CASE-${Date.now().toString().slice(-6)}`;
            await prisma.violationCase.create({
              data: {
                caseNumber,
                driverId: driver.id,
                vehicleId: driver.currentVehicleId,
                zoneId: activePermitZone.id,
                category: ViolationCategory.GEOFENCE_BREACH,
                status: ViolationStatus.CANDIDATE_REVIEW,
                evidenceJson: JSON.stringify({
                  lat: data.latitude,
                  lng: data.longitude,
                  accuracyMeters: data.accuracyMeters,
                  speedKmh: data.speedKmh,
                  zoneName: activePermitZone.name,
                  recordedAt,
                }),
                officerNotes: "Automated candidate flag: GPS coordinate outside permitted ward boundary.",
              },
            });

            // Notify admin room about candidate breach
            io.to("authority-room").emit("violation:candidate", {
              caseNumber,
              driverName: req.user!.name,
              zoneName: activePermitZone.name,
            });
          }
        }

        // Broadcast live update to authority dashboard map
        io.to("authority-room").emit("tracking:update", {
          driverId: driver.id,
          driverName: req.user!.name,
          phone: req.user!.phone,
          vehicleId: driver.currentVehicleId,
          lat: data.latitude,
          lng: data.longitude,
          speedKmh: data.speedKmh,
          isInsideZone: isInsidePermittedZone,
          updatedAt: new Date().toISOString(),
        });

        res.json({
          status: "OK",
          isInsideZone: isInsidePermittedZone,
          reportId: report.id,
        });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.errors });
          return;
        }
        res.status(500).json({ error: "Failed to record location report" });
      }
    }
  );

  // Authority Live Fleet Map (FR-14, FR-18)
  router.get(
    "/live",
    authenticate,
    authorizeRoles(
      Role.ADMIN,
      Role.REGISTRATION_REVIEWER,
      Role.PERMIT_OFFICER,
      Role.ENFORCEMENT_OFFICER
    ),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const drivers = await prisma.driverProfile.findMany({
          where: { isOnDuty: true },
          include: {
            user: { select: { name: true, phone: true } },
            permits: { where: { status: PermitStatus.ACTIVE }, include: { zone: true } },
            driverVehicleLinks: { include: { vehicle: true } },
          },
        });

        // Calculate freshness (stale if > 2 minutes without ping)
        const now = Date.now();
        const liveDrivers = drivers.map((d) => {
          const pingAgeMs = d.lastPingAt ? now - new Date(d.lastPingAt).getTime() : Infinity;
          const isStale = pingAgeMs > 2 * 60 * 1000;

          return {
            driverId: d.id,
            name: d.user.name,
            phone: d.user.phone,
            lat: d.lastLatitude,
            lng: d.lastLongitude,
            lastPingAt: d.lastPingAt,
            isStale,
            permits: d.permits.map((p) => ({
              permitNumber: p.permitNumber,
              zoneName: p.zone.name,
              wardNumber: p.zone.wardNumber,
            })),
            currentVehicle: d.driverVehicleLinks.find((l) => l.vehicleId === d.currentVehicleId)?.vehicle,
          };
        });

        res.json({ drivers: liveDrivers });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch live fleet locations" });
      }
    }
  );

  return router;
}
