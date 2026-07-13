import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000]
const phases = ['evaluation_1', 'evaluation_2', 'funded']

const rules: Record<string, { profitTarget: number | null; maxDailyLoss: number; maxOverallLoss: number; maxPositionSize: number; maxLeverage: number; maxOpenTrades: number; minTradingDays: number; maxTradingDays: number }> = {
  evaluation_1: { profitTarget: 8, maxDailyLoss: 6, maxOverallLoss: 10, maxPositionSize: 5, maxLeverage: 100, maxOpenTrades: 5, minTradingDays: 5, maxTradingDays: 30 },
  evaluation_2: { profitTarget: 5, maxDailyLoss: 6, maxOverallLoss: 10, maxPositionSize: 5, maxLeverage: 100, maxOpenTrades: 5, minTradingDays: 5, maxTradingDays: 30 },
  funded: { profitTarget: 0, maxDailyLoss: 6, maxOverallLoss: 10, maxPositionSize: 10, maxLeverage: 100, maxOpenTrades: 10, minTradingDays: 0, maxTradingDays: 0 },
}

async function main() {
  console.log('Seeding admin user...')
  const adminEmail = 'admin@pro-fundx.com'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const hash = await bcrypt.hash('Admin123!', 12)
    await prisma.user.create({
      data: { email: adminEmail, passwordHash: hash, role: 'admin', emailVerified: true },
    })
    console.log(`Admin created: ${adminEmail} / Admin123!`)
  } else {
    console.log(`Admin already exists: ${adminEmail}`)
  }

  console.log('Seeding trading rule configs...')

  for (const size of accountSizes) {
    for (const phase of phases) {
      const rule = rules[phase]
      await prisma.tradingRuleConfig.upsert({
        where: { accountSize_phase: { accountSize: size, phase } },
        update: {},
        create: {
          accountSize: size,
          phase,
          profitTarget: rule.profitTarget,
          maxDailyLoss: rule.maxDailyLoss,
          maxOverallLoss: rule.maxOverallLoss,
          maxPositionSize: rule.maxPositionSize,
          maxLeverage: rule.maxLeverage,
          maxOpenTrades: rule.maxOpenTrades,
          minTradingDays: rule.minTradingDays,
          maxTradingDays: rule.maxTradingDays,
        },
      })
    }
  }

  console.log('Seeding complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
