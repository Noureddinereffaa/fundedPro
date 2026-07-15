import http from 'http';

const body = JSON.stringify({ email: 'admin@profundx.com', password: 'Admin@123456' });
const opts = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'User-Agent': 'curl/8.18.0',
    'Accept': '*/*'
  }
};

const req = http.request(opts, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    console.log(JSON.stringify({ status: res.statusCode, body: data, headers: res.headers }));
  });
});
req.end(body);
