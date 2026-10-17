import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { logAuditEvent } from "../middlewares/audit.js";
import { Role } from "../types/enums.js";

const router = Router();

// List all active operating zones
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const zones = await prisma.operatingZone.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { permits: true, trips: true },
        },
      },
    });

    res.json({ zones });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch operating zones" });
  }
});

// Admin: Create or update operating zone (FR-12)
const zoneSchema = z.object({
  name: z.string().min(2),
  city: z.string().default("Dhaka"),
  wardNumber: z.string(),
  polygonGeoJson: z.string(), // GeoJSON coordinates string
  speedLimitKmh: z.number().default(25.0),
  maxPermittedVehicles: z.number().default(500),
  isActive: z.boolean().default(true),
});

router.post(
  "/",
  authenticate,
  authorizeRoles(Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data = zoneSchema.parse(req.body);

      // Validate that polygonGeoJson is parseable
      JSON.parse(data.polygonGeoJson);

      const zone = await prisma.operatingZone.create({
        data,
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: "OPERATING_ZONE_CREATED",
        entityType: "OperatingZone",
        entityId: zone.id,
        details: { name: zone.name, wardNumber: zone.wardNumber },
        ipAddress: req.ip,
      });

      res.status(201).json({ message: "Zone created successfully", zone });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to create operating zone" });
    }
  }
);

export default router;
