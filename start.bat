@echo off
setlocal EnableDelayedExpansion
title Pro FundX - Launch Control
color 0B

:: ============================================================
::  Pro FundX Platform - Professional Start Script
::  Starts: Frontend (5173), API (3001), WebSocket (3002)
:: ============================================================

set "ROOT=%~dp0"
set "LOG_DIR=%ROOT%logs"
set "FRONTEND_LOG=%LOG_DIR%\frontend.log"
set "API_LOG=%LOG_DIR%\api.log"
set "WS_LOG=%LOG_DIR%\ws.log"
set "START_LOG=%LOG_DIR%\start.log"

:: Create logs directory
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Parse arguments
set "MODE=all"
set "SKIP_CHECKS=0"
if "%~1"=="--frontend" set "MODE=frontend"
if "%~1"=="--api" set "MODE=api"
if "%~1"=="--ws" set "MODE=ws"
if "%~1"=="--skip-checks" set "SKIP_CHECKS=1"
if "%~1"=="--help" goto :show_help
if "%~1"=="-h" goto :show_help

echo.
echo  ███████╗██████╗ ███████╗███████╗██████╗ ████████╗███████╗██████╗ ███╗   ███╗
echo  ██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
echo  █████╗  ██████╔╝█████╗  █████╗  ██████╔╝   ██║   █████╗  ██████╔╝██╔████╔██║
echo  ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██╔══██╗   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║
echo  ██║     ██║  ██║███████╗███████╗██║  ██║   ██║   ███████╗██║  ██║██║ ╚═╝ ██║
echo  ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
echo.
echo  ─────────────────────────────────────────────────────────────
echo   Professional Trading Platform - Launch Control
echo  ─────────────────────────────────────────────────────────────
echo.

:: Log timestamp
echo [%date% %time%] Starting Pro FundX >> "%START_LOG%"

:: ── Step 1: Check Node.js ───────────────────────────────────
if "%SKIP_CHECKS%"=="0" (
    echo  [CHECK] Node.js version...
    where node >nul 2>&1
    if errorlevel 1 (
        echo  [ERROR] Node.js is not installed or not in PATH.
        echo  [FIX]   Install Node.js 20+ from https://nodejs.org
        echo [%date% %time%] ERROR: Node.js not found >> "%START_LOG%"
        goto :exit_error
    )
    for /f "tokens=*" %%i in ('node -v') do set "NODE_VER=%%i"
    echo  [  OK] Node.js !NODE_VER! detected
    
    :: Check minimum version (20+)
    for /f "tokens=1 delims=." %%a in ("!NODE_VER:v=!") do set "NODE_MAJOR=%%a"
    if !NODE_MAJOR! LSS 20 (
        echo  [WARN] Node.js 20+ recommended. Found !NODE_VER!
        echo  [WARN] Some features may not work correctly.
    )
    echo.

    :: ── Step 2: Check if ports are in use ───────────────────
    echo  [CHECK] Port availability...
    set "PORT_CONFLICT=0"
    
    for %%p in (5173 3001 3002) do (
        netstat -ano | findstr ":%%p " | findstr "LISTENING" >nul 2>&1
        if not errorlevel 1 (
            echo  [WARN] Port %%p is already in use!
            set "PORT_CONFLICT=1"
        )
    )
    
    if "!PORT_CONFLICT!"=="1" (
        echo.
        echo  [INFO] Some ports are in use. Services may fail to start.
        echo  [FIX]  Run stop.bat first, or use --skip-checks
        echo.
        choice /c YN /m "  Continue anyway?"
        if errorlevel 2 goto :exit_error
    )
    echo  [  OK] Port check complete
    echo.

    :: ── Step 3: Check dependencies ──────────────────────────
    echo  [CHECK] Dependencies...
    if not exist "%ROOT%node_modules\.package-lock.json" (
        echo  [FIX]  Installing root dependencies...
        call npm install --prefix "%ROOT%"
    )
    if not exist "%ROOT%api\node_modules\.package-lock.json" (
        echo  [FIX]  Installing API dependencies...
        call npm install --prefix "%ROOT%api"
    )
    if not exist "%ROOT%server\node_modules\.package-lock.json" (
        echo  [FIX]  Installing server dependencies...
        call npm install --prefix "%ROOT%server"
    )
    echo  [  OK] Dependencies ready
    echo.

    :: ── Step 4: Check database ──────────────────────────────
    echo  [CHECK] PostgreSQL database...
    where psql >nul 2>&1
    if not errorlevel 1 (
        pg_isready >nul 2>&1
        if errorlevel 1 (
            echo  [WARN] PostgreSQL may not be running.
            echo  [FIX]  Start PostgreSQL service manually.
        ) else (
            echo  [  OK] PostgreSQL is running
        )
    ) else (
        echo  [SKIP] psql not found in PATH (using Docker or external DB?)
    )
    echo.
)

:: ── Step 5: Start services ──────────────────────────────────
echo  ─────────────────────────────────────────────────────────────
echo   Starting services...
echo  ─────────────────────────────────────────────────────────────
echo.

if "%MODE%"=="frontend" goto :start_frontend
if "%MODE%"=="api" goto :start_api
if "%MODE%"=="ws" goto :start_ws

:: Start all services with concurrently
echo  [1/3] Starting Frontend (Vite)..... 
echo  [2/3] Starting API (Express).......
echo  [3/3] Starting WebSocket Engine.....
echo.
echo  ─────────────────────────────────────────────────────────────
echo   All services starting with concurrently
echo   Frontend:  http://localhost:5173
echo   API:       http://localhost:3001/api
echo   WebSocket: ws://localhost:3002
echo  ─────────────────────────────────────────────────────────────
echo.
echo  Press Ctrl+C to stop all services
echo.

call npm run dev:all
goto :exit_ok

:: ── Individual service starts ───────────────────────────────

:start_frontend
echo  Starting Frontend (Vite) on port 5173...
echo  Log: %FRONTEND_LOG%
echo.
cd /d "%ROOT%"
call npm run dev
goto :exit_ok

:start_api
echo  Starting API (Express) on port 3001...
echo  Log: %API_LOG%
echo.
cd /d "%ROOT%api"
call npm run dev
goto :exit_ok

:start_ws
echo  Starting WebSocket Engine on port 3002...
echo  Log: %WS_LOG%
echo.
cd /d "%ROOT%server"
call npm run dev
goto :exit_ok

:: ── Help ────────────────────────────────────────────────────

:show_help
echo  Usage: start.bat [OPTIONS]
echo.
echo  Options:
echo    (none)       Start all services with concurrently
echo    --frontend   Start only the Vite frontend
echo    --api        Start only the Express API
echo    --ws         Start only the WebSocket engine
echo    --skip-checks  Skip pre-flight checks
echo    --help, -h   Show this help message
echo.
echo  Examples:
echo    start.bat                 Start everything
echo    start.bat --ws            Start only WebSocket engine
echo    start.bat --skip-checks   Start without checks
echo.
goto :exit_ok

:: ── Exit handlers ───────────────────────────────────────────

:exit_ok
echo.
echo [%date% %time%] Started successfully >> "%START_LOG%"
endlocal
exit /b 0

:exit_error
echo.
echo  ─────────────────────────────────────────────────────────────
echo   Launch failed. Check logs for details.
echo  ─────────────────────────────────────────────────────────────
echo [%date% %time%] Launch failed >> "%START_LOG%"
endlocal
exit /b 1
