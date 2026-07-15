const http = require('http');
async function run() {
  const res = await new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 57,
                 'User-Agent': 'curl/8.18.0', 'Accept': '*/*', 'Host': 'localhost:3001' } };
    const req = http.request(opts, resolve);
    req.write('{"email":"admin@profundx.com","password":"Admin@123456"}');
    req.end();
  });
  let body = '';
  res.on('data', (c) => body += c);
  await new Promise((r) => res.on('end', r));
  console.log('Status:', res.statusCode);
  console.log('Body:', body);
}
run().catch(e => console.error('CRASH:', e));
