import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface AuditEvent {
  tenantId: string | null;
  actorId: string | null;
  actorScope: 'platform' | 'tenant' | 'customer' | 'system';
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Append-only audit trail writer. Persists best-effort: an audit failure must
 * never roll back or block the business action it describes, so write errors
 * are logged and swallowed. In production the persist call is offloaded to a
 * queue; here it writes directly and non-blockingly.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: event.tenantId,
          actorId: event.actorId,
          actorScope: event.actorScope,
          action: event.action,
          targetType: event.targetType,
          targetId: event.targetId,
          metadata: event.metadata ?? {},
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit event "${event.action}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
