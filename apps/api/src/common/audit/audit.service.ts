import { Inject, Injectable } from "@nestjs/common";
import type { AuditAction, Prisma, PrismaClient } from "@vetclinic/db";
import { PRISMA_CLIENT } from "../prisma/prisma.constants";

interface RecordAuditInput {
  userId: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string;
}

/**
 * Único punto de escritura de AuditLog (RN-17: la bitácora es de solo
 * escritura desde la aplicación, nunca se expone UPDATE/DELETE).
 */
@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityName: input.entityName,
        entityId: input.entityId,
        changes: input.changes,
        ipAddress: input.ipAddress,
      },
    });
  }
}
