for i in 1 2 3 4 5; do
  echo "--- attempt $i ---"
  curl -sk --connect-timeout 3 --max-time 8 \
    -X POST "http://localhost:3001/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@profundx.com","password":"Admin@123456"}' \
    -w ' HTTP_STATUS:%{http_code}' \
    2>&1
  echo
  sleep 1
done
