#!/bin/bash
# Seed badges via API as admin
TOKEN=$(curl -sk --connect-timeout 5 --max-time 10 \
  -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@profundx.com","password":"Admin@123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Failed to get admin token"
  exit 1
fi

echo "Got admin token, seeding badges..."
curl -sk --connect-timeout 5 --max-time 10 \
  -X POST "http://localhost:3001/api/badges/seed" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

echo ""
echo "Checking badges count..."
curl -sk --connect-timeout 5 --max-time 10 \
  -X GET "http://localhost:3001/api/badges" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'Total badges: {len(data)}')" 2>/dev/null
