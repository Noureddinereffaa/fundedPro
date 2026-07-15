docker exec pro-fundx-api sh -c '
  sed -i "s/const { statusCode, message } = getErrorInfo(error);/console.log(\"[LOGIN_DEBUG] typeof error:\", typeof error); console.log(\"[LOGIN_DEBUG] error.message:\", error?.message); console.log(\"[LOGIN_DEBUG] error instanceof Error:\", error instanceof Error); console.log(\"[LOGIN_DEBUG] error instanceof AppError:\", error instanceof AppError); console.log(\"[LOGIN_DEBUG] error:\", error); Object.keys(error).forEach(k => console.log(\"[LOGIN_DEBUG] error.\" + k + \":\", error[k])); const { statusCode, message } = getErrorInfo(error);/" /app/dist/routes/auth.js
  
  sed -i "s/const data = loginSchema.parse(req.body);/console.log(\"[LOGIN_DEBUG] req.body:\", JSON.stringify(req.body)); console.log(\"[LOGIN_DEBUG] req.ip:\", req.ip); console.log(\"[LOGIN_DEBUG] req.headers.user-agent:\", req.headers[\"user-agent\"]); const data = loginSchema.parse(req.body);/" /app/dist/routes/auth.js
  
  echo "Patched successfully"
  grep "LOGIN_DEBUG" /app/dist/routes/auth.js
'
