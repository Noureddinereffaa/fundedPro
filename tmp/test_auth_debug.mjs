import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';

async function main() {
  const email = 'admin@profundx.com';
  const password = 'Admin@123456';
  
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('User found:', !!user);
  
  if (user) {
    console.log('TwoFactorEnabled:', user.twoFactorEnabled);
    console.log('TwoFactorSecret:', !!user.twoFactorSecret);
    console.log('LoginAttempts:', user.loginAttempts);
    console.log('LockUntil:', user.lockUntil);
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', valid);
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
