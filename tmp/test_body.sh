#!/bin/bash
curl -sk --connect-timeout 5 --max-time 10 \
  -X POST 'http://localhost:3001/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@profundx.com","password":"Admin@123456"}'
echo ""
echo "---"
echo -n '{"email":"admin@profundx.com","password":"Admin@123456"}' | xxd | head -5
echo "---"
echo -n '{"email":"admin@profundx.com","password":"Admin@123456"}' | wc -c
