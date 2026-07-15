import { PrismaClient } from '@prisma/client'

/** Single Prisma client instance — import from here, not from index.ts */
export const prisma = new PrismaClient()