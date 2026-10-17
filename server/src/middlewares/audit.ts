import { prisma } from "../config/db.js";
import { Role } from "../types/enums.js";

export interface LogAuditParams {
  userId?: string;
  userRole?: Role;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: JSON.stringify(params.details),
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to write append-only audit log:", error);
  }
}
