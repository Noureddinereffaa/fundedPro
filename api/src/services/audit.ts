import { prisma } from '../index.js'

export class AuditService {
  async log(adminId: string, action: string, target?: string, details?: Record<string, unknown>) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        target,
        details: details || undefined,
      } as any,
    })
  }
}
