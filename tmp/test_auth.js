const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const u = await p.user.findUnique({where:{email:'admin@profundx.com'}});
  console.log('Found:', !!u);
  if (u) {
    console.log('PasswordHash:', u.passwordHash?.substring(0,30));
    const match = await bcrypt.compare('Admin@123456', u.passwordHash);
    console.log('Password match:', match);
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); });
