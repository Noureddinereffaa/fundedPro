import http from 'http';

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
  const req = http.request(opts, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });
  req.write(body);
  req.end();
});
console.log('Status:', res.status);
console.log('Body:', res.body);
