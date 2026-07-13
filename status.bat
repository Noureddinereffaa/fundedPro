@echo off
setlocal EnableDelayedExpansion
title Pro FundX - Service Status
color 0B

:: ============================================================
::  Pro FundX Platform - Service Health Check
::  Checks: Frontend (5173), API (3001), WebSocket (3002)
:: ============================================================

echo.
echo  ─────────────────────────────────────────────────────────────
echo   Pro FundX - Service Status
echo   %date% %time%
echo  ─────────────────────────────────────────────────────────────
echo.

:: ── Node.js ────────────────────────────────────────────────
echo  [ENV] Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo        NOT INSTALLED
) else (
    for /f "tokens=*" %%i in ('node -v') do set "NODE_VER=%%i"
    echo        !NODE_VER! [OK]
)
echo.

:: ── Frontend (5173) ────────────────────────────────────────
echo  [1] Frontend (Vite) ─ Port 5173
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo        Status:  STOPPED
    echo        URL:     http://localhost:5173
) else (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do set "FPID=%%a"
    echo        Status:  RUNNING
    echo        PID:     !FPID!
    echo        URL:     http://localhost:5173
    
    :: Health check
    curl -s -o nul -w "%%{http_code}" http://localhost:5173 >nul 2>&1
    if errorlevel 1 (
        echo        Health:  UNREACHABLE
    ) else (
        echo        Health:  OK
    )
)
echo.

:: ── API (3001) ─────────────────────────────────────────────
echo  [2] API Server (Express) ─ Port 3001
netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo        Status:  STOPPED
    echo        URL:     http://localhost:3001/api
) else (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do set "APID=%%a"
    echo        Status:  RUNNING
    echo        PID:     !APID!
    echo        URL:     http://localhost:3001/api
    
    :: Health check
    curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health >nul 2>&1
    if errorlevel 1 (
        echo        Health:  UNREACHABLE
    ) else (
        echo        Health:  OK
    )
)
echo.

:: ── WebSocket (3002) ───────────────────────────────────────
echo  [3] WebSocket Engine ─ Port 3002
netstat -ano | findstr ":3002 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo        Status:  STOPPED
    echo        URL:     ws://localhost:3002
) else (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002 " ^| findstr "LISTENING"') do set "WSID=%%a"
    echo        Status:  RUNNING
    echo        PID:     !WSID!
    echo        URL:     ws://localhost:3002
)
echo.

:: ── PostgreSQL ──────────────────────────────────────────────
echo  [DB] PostgreSQL...
where psql >nul 2>&1
if errorlevel 1 (
    echo        psql not found (using Docker or external?)
) else (
    pg_isready >nul 2>&1
    if errorlevel 1 (
        echo        Status:  STOPPED
    ) else (
        echo        Status:  RUNNING
    )
)
echo.

:: ── Summary ────────────────────────────────────────────────
echo  ─────────────────────────────────────────────────────────────

set "RUNNING=0"
set "TOTAL=3"

netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1 && set /a RUNNING+=1
netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul 2>&1 && set /a RUNNING+=1
netstat -ano | findstr ":3002 " | findstr "LISTENING" >nul 2>&1 && set /a RUNNING+=1

if !RUNNING! EQU 3 (
    echo   All 3 services are running
) else if !RUNNING! EQU 0 (
    echo   All services are stopped
) else (
    echo   !RUNNING!/!TOTAL! services are running
)
echo  ─────────────────────────────────────────────────────────────
echo.

endlocal
exit /b 0
