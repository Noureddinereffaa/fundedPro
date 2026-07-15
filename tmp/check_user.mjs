import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@profundx.com';
  const password = 'Admin@123456';
  
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('User found:', !!user);
  
  if (user) {
    console.log('2FA enabled:', user.twoFactorEnabled);
    console.log('Login attempts:', user.loginAttempts);
    console.log('Lock until:', user.lockUntil);
    console.log('Password hash prefix:', user.passwordHash?.substring(0, 20));
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password match:', valid);
    
    // Check if user is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      console.log('ACCOUNT LOCKED until:', user.lockUntil);
    } else {
      console.log('Account not locked');
    }
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
