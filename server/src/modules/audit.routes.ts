import { Router, Request, Response } from "express";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { Role } from "../types/enums.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizeRoles(Role.ADMIN, Role.PERMIT_OFFICER, Role.ENFORCEMENT_OFFICER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType, entityId, limit = "100" } = req.query;

      const logs = await prisma.auditLog.findMany({
        where: {
          ...(entityType ? { entityType: String(entityType) } : {}),
          ...(entityId ? { entityId: String(entityId) } : {}),
        },
        include: {
          user: { select: { name: true, phone: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: parseInt(String(limit), 10),
      });

      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

export default router;
