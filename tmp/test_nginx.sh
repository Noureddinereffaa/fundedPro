#!/bin/bash
curl -sk --connect-timeout 5 --max-time 10 \
  -X POST "https://profundx.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@profundx.com","password":"Admin@123456"}'
echo ""
