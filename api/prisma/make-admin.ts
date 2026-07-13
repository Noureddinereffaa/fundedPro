import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npx tsx prisma/make-admin.ts <email>')
    process.exit(1)
  }
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' },
  })
  console.log(`User ${user.email} is now admin`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
