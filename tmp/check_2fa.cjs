const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({where:{email:'admin@profundx.com'}}).then(u => {
  console.log('2FA:', u.twoFactorEnabled);
  console.log('TOTP:', !!u.twoFactorSecret);
  p.$disconnect();
}).catch(e => { console.error(e); p.$disconnect(); });
