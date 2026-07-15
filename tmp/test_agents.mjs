import http from 'http';
import https from 'https';

const agents = [
  { name: 'fetch (Node 20)', makeRequest: async () => {
    const res = await globalThis.fetch('http://127.0.0.1:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@profundx.com', password: 'Admin@123456' })
    });
    return { status: res.status, body: await res.text() };
  }},
  { name: 'http.request with Host:127.0.0.1', makeRequest: () => new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 57 } };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.write('{"email":"admin@profundx.com","password":"Admin@123456"}');
    req.end();
  })},
  { name: 'http.request with Host:localhost', makeRequest: () => new Promise((resolve) => {
    const opts = { hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 57, 'Host': 'localhost:3001' } };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.write('{"email":"admin@profundx.com","password":"Admin@123456"}');
    req.end();
  })},
  { name: 'curl-like (no Accept header)', makeRequest: () => new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 57, 'User-Agent': 'curl/8.18.0', 'Accept': '*/*' } };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.write('{"email":"admin@profundx.com","password":"Admin@123456"}');
    req.end();
  })},
  { name: 'curl-like with Host:localhost', makeRequest: () => new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 57, 'User-Agent': 'curl/8.18.0', 'Accept': '*/*', 'Host': 'localhost:3001' } };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.write('{"email":"admin@profundx.com","password":"Admin@123456"}');
    req.end();
  })},
  { name: 'no Content-Type header', makeRequest: () => new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Length': 57 } };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.write('{"email":"admin@profundx.com","password":"Admin@123456"}');
    req.end();
  })},
];

async function main() {
  for (const agent of agents) {
    try {
      const result = await agent.makeRequest();
      console.log(`[${agent.name}] => ${result.status} ${result.body.substring(0, 80)}`);
    } catch (e) {
      console.log(`[${agent.name}] => ERROR ${e.message}`);
    }
  }
}
main();
