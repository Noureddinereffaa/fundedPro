const http = require('http');
const data = JSON.stringify({email:"admin@profundx.com",password:"Admin@123456"});
const req = http.request({hostname:"localhost",port:3001,path:"/api/auth/login",method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(data)}}, res => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => console.log(res.statusCode, body));
});
req.write(data);
req.end();
