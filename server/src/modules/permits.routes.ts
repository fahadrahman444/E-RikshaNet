import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { logAuditEvent } from "../middlewares/audit.js";
import { Role, PermitStatus, RegistrationStatus } from "../types/enums.js";

const router = Router();

// Apply for a permit (Driver)
const applyPermitSchema = z.object({
  zoneId: z.string(),
  vehicleId: z.string(),
});

router.post(
  "/apply",
  authenticate,
  authorizeRoles(Role.DRIVER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId, vehicleId } = applyPermitSchema.parse(req.body);

      const driver = await prisma.driverProfile.findUnique({
        where: { userId: req.user!.id },
        include: { driverVehicleLinks: true },
      });

      if (!driver) {
        res.status(404).json({ error: "Driver profile not found" });
        return;
      }

      // FR-08: Check driver registration is approved
      if (driver.status !== RegistrationStatus.APPROVED) {
        res.status(400).json({
          error: "Your driver registration must be APPROVED before applying for an operating permit.",
        });
        return;
      }

      // Check vehicle is approved and linked to this driver
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle || vehicle.status !== RegistrationStatus.APPROVED) {
        res.status(400).json({
          error: "Selected vehicle must be registered and APPROVED before applying for a permit.",
        });
        return;
      }

      const isLinked = driver.driverVehicleLinks.some((l) => l.vehicleId === vehicleId);
      if (!isLinked) {
        res.status(400).json({ error: "Vehicle is not linked to your driver profile." });
        return;
      }

      // Check existing active or pending permit for this driver & zone
      const existing = await prisma.permit.findFirst({
        where: {
          driverId: driver.id,
          zoneId,
          status: { in: [PermitStatus.PENDING, PermitStatus.ACTIVE] },
        },
      });

      if (existing) {
        res.status(409).json({
          error: "An active or pending permit application already exists for this zone.",
        });
        return;
      }

      const permitNumber = `PRM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const permit = await prisma.permit.create({
        data: {
          permitNumber,
          driverId: driver.id,
          vehicleId,
          zoneId,
          status: PermitStatus.PENDING,
        },
        include: { zone: true, vehicle: true },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: "PERMIT_APPLICATION_SUBMITTED",
        entityType: "Permit",
        entityId: permit.id,
        details: { permitNumber: permit.permitNumber, zoneId },
        ipAddress: req.ip,
      });

      res.status(201).json({ message: "Permit application submitted", permit });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to submit permit application" });
    }
  }
);

// List permits (Authorized officer / Admin or Driver's own permits)
router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const isOfficer = (
      [Role.ADMIN, Role.PERMIT_OFFICER, Role.ENFORCEMENT_OFFICER] as Role[]
    ).includes(req.user!.role);

    let whereClause: any = {};
    if (!isOfficer) {
      const driver = await prisma.driverProfile.findUnique({
        where: { userId: req.user!.id },
      });
      if (!driver) {
        res.json({ permits: [] });
        return;
      }
      whereClause = { driverId: driver.id };
    } else {
      const { status, zoneId } = req.query;
      if (status) whereClause.status = String(status);
      if (zoneId) whereClause.zoneId = String(zoneId);
    }

    const permits = await prisma.permit.findMany({
      where: whereClause,
      include: {
        driver: { include: { user: { select: { name: true, phone: true } } } },
        vehicle: true,
        zone: true,
        issuedBy: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ permits });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch permits" });
  }
});

// Officer Decision (FR-09, FR-10, BR-11)
const decisionSchema = z.object({
  status: z.nativeEnum(PermitStatus),
  decisionNotes: z.string().min(3, "Mandatory reason required for audit compliance"),
  validityDays: z.number().default(180), // default 6 months
});

router.patch(
  "/:id/decision",
  authenticate,
  authorizeRoles(Role.ADMIN, Role.PERMIT_OFFICER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, decisionNotes, validityDays } = decisionSchema.parse(req.body);

      const effectiveDate = status === PermitStatus.ACTIVE ? new Date() : undefined;
      const expiryDate =
        status === PermitStatus.ACTIVE
          ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
          : undefined;

      const permit = await prisma.permit.update({
        where: { id },
        data: {
          status,
          decisionNotes,
          issuedById: req.user!.id,
          effectiveDate,
          expiryDate,
        },
        include: { driver: { include: { user: true } }, zone: true },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: `PERMIT_STATUS_${status}`,
        entityType: "Permit",
        entityId: id,
        details: { status, decisionNotes, permitNumber: permit.permitNumber, expiryDate },
        ipAddress: req.ip,
      });

      res.json({ message: `Permit updated to ${status}`, permit });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to process permit decision" });
    }
  }
);

export default router;
