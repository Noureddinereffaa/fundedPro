import { prisma } from '../index.js'
import { AppError } from '../middleware/errorHandler.js'

export async function verifyAccountOwnership(accountId: string, userId: string): Promise<void> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  })
  if (!account) throw new AppError('Account not found', 404)
}
