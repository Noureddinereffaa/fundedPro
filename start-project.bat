@echo off
color 0A
title FundedPro - Starting Servers
echo ===================================================
echo               FundedPro Platform
echo ===================================================
echo.
echo [1] Starting Vite Frontend (Port 5173)
echo [2] Starting Backend API (Port 3001)
echo [3] Starting WebSocket Engine (Port 3002)
echo.
echo Press Ctrl+C anytime to stop the servers manually.
echo ===================================================
echo.

call npm run dev:all

pause
