import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { logAuditEvent } from "../middlewares/audit.js";
import { Role, RegistrationStatus } from "../types/enums.js";

const router = Router();

const vehicleSchema = z.object({
  registrationNumber: z.string().min(3),
  chassisNumber: z.string().min(4),
  model: z.string().min(2),
  batteryCapacityKwh: z.number().optional(),
});

// Register a vehicle
router.post(
  "/",
  authenticate,
  authorizeRoles(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = vehicleSchema.parse(req.body);

      const existing = await prisma.vehicle.findFirst({
        where: {
          OR: [{ registrationNumber: data.registrationNumber }, { chassisNumber: data.chassisNumber }],
        },
      });

      if (existing) {
        res.status(409).json({ error: "Vehicle with this registration or chassis number already exists" });
        return;
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          ...data,
          ownerId: req.user!.id,
          status: RegistrationStatus.SUBMITTED,
        },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: "VEHICLE_REGISTERED",
        entityType: "Vehicle",
        entityId: vehicle.id,
        details: { registrationNumber: vehicle.registrationNumber },
        ipAddress: req.ip,
      });

      res.status(201).json({ message: "Vehicle registered successfully", vehicle });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to register vehicle" });
    }
  }
);

// List vehicles
router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const isAuthority = (
      [Role.ADMIN, Role.REGISTRATION_REVIEWER, Role.PERMIT_OFFICER, Role.ENFORCEMENT_OFFICER] as Role[]
    ).includes(req.user!.role);

    const vehicles = await prisma.vehicle.findMany({
      where: isAuthority ? undefined : { ownerId: req.user!.id },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        driverLinks: { include: { driver: { include: { user: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ vehicles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

// Link driver to vehicle (FR-05)
const linkSchema = z.object({
  driverId: z.string(),
  isPrimary: z.boolean().default(false),
});

router.post(
  "/:id/link-driver",
  authenticate,
  authorizeRoles(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: vehicleId } = req.params;
      const { driverId, isPrimary } = linkSchema.parse(req.body);

      const link = await prisma.driverVehicleLink.upsert({
        where: {
          driverId_vehicleId: { driverId, vehicleId },
        },
        create: { driverId, vehicleId, isPrimary },
        update: { isPrimary },
      });

      res.json({ message: "Driver linked to vehicle successfully", link });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to link driver" });
    }
  }
);

// Review vehicle (FR-04)
const reviewVehicleSchema = z.object({
  status: z.nativeEnum(RegistrationStatus),
  reviewNotes: z.string().min(3),
});

router.patch(
  "/:id/review",
  authenticate,
  authorizeRoles(Role.ADMIN, Role.REGISTRATION_REVIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = reviewVehicleSchema.parse(req.body);

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: { status, reviewNotes },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: `VEHICLE_REVIEW_${status}`,
        entityType: "Vehicle",
        entityId: id,
        details: { status, reviewNotes },
        ipAddress: req.ip,
      });

      res.json({ message: "Vehicle review status updated", vehicle });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to update vehicle review" });
    }
  }
);

export default router;
