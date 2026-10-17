import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { logAuditEvent } from "../middlewares/audit.js";
import { Role, RegistrationStatus } from "../types/enums.js";

const router = Router();

// Reviewer/Admin: List all drivers with filter
router.get(
  "/",
  authenticate,
  authorizeRoles(Role.ADMIN, Role.REGISTRATION_REVIEWER, Role.PERMIT_OFFICER, Role.ENFORCEMENT_OFFICER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.query;
      const drivers = await prisma.driverProfile.findMany({
        where: status ? { status: String(status) } : undefined,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true, status: true } },
          driverVehicleLinks: { include: { vehicle: true } },
          permits: { include: { zone: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ drivers });
    } catch (err) {
      res.status(500).json({ error: "Failed to list drivers" });
    }
  }
);

// Reviewer/Admin: Review driver registration (FR-04)
const reviewSchema = z.object({
  status: z.nativeEnum(RegistrationStatus),
  reviewNotes: z.string().min(3, "Reason/notes are mandatory for audit compliance"),
});

router.patch(
  "/:id/review",
  authenticate,
  authorizeRoles(Role.ADMIN, Role.REGISTRATION_REVIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = reviewSchema.parse(req.body);

      const driver = await prisma.driverProfile.update({
        where: { id },
        data: { status, reviewNotes },
        include: { user: true },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: `DRIVER_REGISTRATION_${status}`,
        entityType: "DriverProfile",
        entityId: id,
        details: { status, reviewNotes, driverPhone: driver.user.phone },
        ipAddress: req.ip,
      });

      res.json({ message: "Driver review status updated", driver });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to update review status" });
    }
  }
);

// Driver: Toggle On-Duty / Off-Duty with Vehicle selection
const dutySchema = z.object({
  isOnDuty: z.boolean(),
  vehicleId: z.string().optional(),
});

router.post("/duty", authenticate, authorizeRoles(Role.DRIVER), async (req: Request, res: Response): Promise<void> => {
  try {
    const { isOnDuty, vehicleId } = dutySchema.parse(req.body);

    const driver = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
      include: { permits: true, driverVehicleLinks: true },
    });

    if (!driver) {
      res.status(404).json({ error: "Driver profile not found" });
      return;
    }

    if (isOnDuty) {
      // BR-02 & BR-05: Check registration approval and active permit
      if (driver.status !== RegistrationStatus.APPROVED) {
        res.status(403).json({
          error: "Driver registration is not approved yet. Cannot go on duty.",
        });
        return;
      }

      const hasActivePermit = driver.permits.some((p) => p.status === "ACTIVE");
      if (!hasActivePermit) {
        res.status(403).json({
          error: "No active operating permit found. Cannot go on duty without valid permit.",
        });
        return;
      }

      if (vehicleId) {
        const isLinked = driver.driverVehicleLinks.some((l) => l.vehicleId === vehicleId);
        if (!isLinked) {
          res.status(403).json({
            error: "Vehicle is not authorized/linked to this driver.",
          });
          return;
        }
      }
    }

    const updated = await prisma.driverProfile.update({
      where: { id: driver.id },
      data: {
        isOnDuty,
        currentVehicleId: isOnDuty ? vehicleId || driver.currentVehicleId : null,
      },
    });

    res.json({ message: `Driver is now ${isOnDuty ? "ONLINE" : "OFFLINE"}`, driver: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: "Failed to toggle duty status" });
  }
});

export default router;
