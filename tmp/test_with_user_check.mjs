import http from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// First check user
const user = await prisma.user.findUnique({ where: { email: 'admin@profundx.com' } });
console.log('User found:', !!user);
if (user) {
  console.log('2FA enabled:', user.twoFactorEnabled);
  console.log('2FA secret:', !!user.twoFactorSecret);
  console.log('Login attempts:', user.loginAttempts);
  console.log('Lock until:', user.lockUntil);
}
await prisma.$disconnect();

// Now try the exact curl-like request
const body = '{"email":"admin@profundx.com","password":"Admin@123456"}';
const opts = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'User-Agent': 'curl/8.18.0',
    'Accept': '*/*',
    'Host': 'localhost:3001'
  }
};

const res = await new Promise((resolve) => {
  const req = http.request(opts, resolve);
  req.write(body);
  req.end();
});
let data = '';
res.on('data', (c) => data += c);
await new Promise((r) => res.on('end', r));
console.log('Status:', res.statusCode);
console.log('Body:', data.substring(0, 200));
