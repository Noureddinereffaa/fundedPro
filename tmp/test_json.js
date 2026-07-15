const http = require('http');

// Test 1: Direct JSON parsing
const testBody = '{"email":"admin@profundx.com","password":"Admin@123456"}';
try {
  JSON.parse(testBody);
  console.log('Test 1 OK: JSON parses cleanly');
} catch (e) {
  console.log('Test 1 FAIL:', e.message);
}

// Test 2: Make a request through localhost and log the raw body
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('Test 2 OK: JSON parsed, email=' + parsed.email);
      res.writeHead(200);
      res.end('ok');
    } catch (e) {
      console.log('Test 2 FAIL: ' + e.message + ' body=' + JSON.stringify(body));
      res.writeHead(500);
      res.end('fail');
    }
  });
});
server.listen(3099, () => {
  // Make a request to self
  const req = http.request({
    hostname: 'localhost',
    port: 3099,
    method: 'POST',
    path: '/',
    headers: {'Content-Type': 'application/json'}
  }, res => {
    res.on('end', () => {
      server.close();
    });
    res.resume();
  });
  req.write(testBody);
  req.end();
});
