import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.js";
import { logAuditEvent } from "../middlewares/audit.js";
import { Role, ViolationStatus, AppealStatus, ViolationCategory } from "../types/enums.js";

const router = Router();

// List violations
router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const isAuthority = (
      [Role.ADMIN, Role.ENFORCEMENT_OFFICER, Role.PERMIT_OFFICER, Role.APPEALS_REVIEWER] as Role[]
    ).includes(req.user!.role);

    let whereClause: any = {};
    if (!isAuthority) {
      const driver = await prisma.driverProfile.findUnique({
        where: { userId: req.user!.id },
      });
      if (!driver) {
        res.json({ violations: [] });
        return;
      }
      whereClause = { driverId: driver.id };
    } else {
      const { status, category } = req.query;
      if (status) whereClause.status = String(status);
      if (category) whereClause.category = String(category);
    }

    const violations = await prisma.violationCase.findMany({
      where: whereClause,
      include: {
        driver: { include: { user: { select: { name: true, phone: true } } } },
        vehicle: true,
        zone: true,
        issuedBy: { select: { name: true, role: true } },
        appeals: {
          include: {
            reviewer: { select: { name: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ violations });
  } catch (err) {
    res.status(500).json({ error: "Failed to list violation cases" });
  }
});

// Officer Notice / Decision (FR-22, BR-07)
const noticeSchema = z.object({
  status: z.enum([ViolationStatus.DISMISSED, ViolationStatus.NOTICE_ISSUED, ViolationStatus.CONFIRMED]),
  officerNotes: z.string().min(3),
  penaltyAmount: z.number().default(0),
});

router.patch(
  "/:id/notice",
  authenticate,
  authorizeRoles(Role.ADMIN, Role.ENFORCEMENT_OFFICER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, officerNotes, penaltyAmount } = noticeSchema.parse(req.body);

      const violation = await prisma.violationCase.update({
        where: { id },
        data: {
          status,
          officerNotes,
          penaltyAmount,
          issuedById: req.user!.id,
        },
        include: { driver: { include: { user: true } } },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: `VIOLATION_CASE_${status}`,
        entityType: "ViolationCase",
        entityId: id,
        details: { status, penaltyAmount, caseNumber: violation.caseNumber, officerNotes },
        ipAddress: req.ip,
      });

      res.json({ message: "Violation case updated", violation });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to record violation decision" });
    }
  }
);

// Driver: Submit Appeal (FR-21)
const appealSchema = z.object({
  reason: z.string().min(5),
  evidenceJson: z.string().optional(),
});

router.post(
  "/:id/appeal",
  authenticate,
  authorizeRoles(Role.DRIVER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: caseId } = req.params;
      const { reason, evidenceJson } = appealSchema.parse(req.body);

      const driver = await prisma.driverProfile.findUnique({
        where: { userId: req.user!.id },
      });

      if (!driver) {
        res.status(404).json({ error: "Driver profile not found" });
        return;
      }

      const violation = await prisma.violationCase.findUnique({
        where: { id: caseId },
      });

      if (!violation || violation.driverId !== driver.id) {
        res.status(404).json({ error: "Violation case not found or not yours" });
        return;
      }

      const appeal = await prisma.violationAppeal.create({
        data: {
          caseId,
          driverId: driver.id,
          reason,
          evidenceJson,
          status: AppealStatus.PENDING,
        },
      });

      // Update case status to APPEALED
      await prisma.violationCase.update({
        where: { id: caseId },
        data: { status: ViolationStatus.APPEALED },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: "VIOLATION_APPEAL_SUBMITTED",
        entityType: "ViolationAppeal",
        entityId: appeal.id,
        details: { caseNumber: violation.caseNumber, reason },
        ipAddress: req.ip,
      });

      res.status(201).json({ message: "Appeal submitted successfully", appeal });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to submit appeal" });
    }
  }
);

// Appeals Reviewer: Resolve Appeal (FR-23)
const resolveAppealSchema = z.object({
  status: z.enum([AppealStatus.APPROVED_DISMISSED, AppealStatus.REJECTED]),
  reviewerNotes: z.string().min(3),
});

router.patch(
  "/appeals/:appealId/decision",
  authenticate,
  authorizeRoles(Role.ADMIN, Role.APPEALS_REVIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appealId } = req.params;
      const { status, reviewerNotes } = resolveAppealSchema.parse(req.body);

      const appeal = await prisma.violationAppeal.update({
        where: { id: appealId },
        data: {
          status,
          reviewerNotes,
          reviewerId: req.user!.id,
          resolvedAt: new Date(),
        },
        include: { case: true },
      });

      // Update parent case accordingly
      const newCaseStatus =
        status === AppealStatus.APPROVED_DISMISSED
          ? ViolationStatus.DISMISSED
          : ViolationStatus.CONFIRMED;

      await prisma.violationCase.update({
        where: { id: appeal.caseId },
        data: { status: newCaseStatus },
      });

      await logAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: `APPEAL_DECISION_${status}`,
        entityType: "ViolationAppeal",
        entityId: appealId,
        details: { status, reviewerNotes, caseNumber: appeal.case.caseNumber },
        ipAddress: req.ip,
      });

      res.json({ message: "Appeal decision recorded", appeal });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      res.status(500).json({ error: "Failed to resolve appeal" });
    }
  }
);

export default router;
