#!/bin/bash
# Test badges through both direct API and nginx
echo "=== Testing badges through direct API ==="
TOKEN=$(curl -sk --connect-timeout 5 --max-time 10 \
  -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@profundx.com","password":"Admin@123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "FAILED to get token"
  exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

echo ""
echo "=== Direct API (port 3001) ==="
curl -sk --connect-timeout 5 --max-time 10 \
  -X GET "http://localhost:3001/api/badges" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "
import sys,json
data = json.load(sys.stdin)
print(f'Status: OK, Count: {len(data)}')
if data:
    print(f'First badge: {data[0][\"name\"]} ({data[0][\"category\"]})')
    unlocked = sum(1 for b in data if b.get('unlocked'))
    print(f'Unlocked: {unlocked}/{len(data)}')
"

echo ""
echo "=== Through nginx ==="
curl -sk --connect-timeout 5 --max-time 10 \
  -X GET "https://profundx.com/api/badges" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "
import sys,json
data = json.load(sys.stdin)
print(f'Status: OK, Count: {len(data)}')
if data:
    print(f'First badge: {data[0][\"name\"]} ({data[0][\"category\"]})')
    unlocked = sum(1 for b in data if b.get('unlocked'))
    print(f'Unlocked: {unlocked}/{len(data)}')
"
