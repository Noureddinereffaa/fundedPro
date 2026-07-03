@echo off
color 0C
title FundedPro - Stopping Servers
echo ===================================================
echo               FundedPro Platform
echo ===================================================
echo.
echo Stopping all running services...

echo.
echo [1] Stopping Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

echo [2] Stopping Backend API (Port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1

echo [3] Stopping WebSocket Engine (Port 3002)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002') do taskkill /F /PID %%a >nul 2>&1

:: Also kill leftover node processes associated with the project if needed
echo [4] Cleaning up running scripts...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*" >nul 2>&1

echo.
echo ===================================================
echo All FundedPro services have been stopped successfully!
echo ===================================================
timeout /t 3
