const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const count = await p.badge.count();
  console.log('Badges count:', count);
  if (count > 0) {
    const badges = await p.badge.findMany();
    console.log('Badges:', JSON.stringify(badges.map(b => ({ key: b.key, name: b.name, category: b.category }))));
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); });
