@echo off
setlocal EnableDelayedExpansion
title Pro FundX - Shutdown Control
color 0C

:: ============================================================
::  Pro FundX Platform - Professional Stop Script
::  Gracefully stops: Frontend (5173), API (3001), WebSocket (3002)
:: ============================================================

set "ROOT=%~dp0"
set "LOG_DIR=%ROOT%logs"
set "STOP_LOG=%LOG_DIR%\stop.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Parse arguments
set "FORCE=0"
set "TARGET=all"
if "%~1"=="--force" set "FORCE=1"
if "%~1"=="-f" set "FORCE=1"
if "%~1"=="--frontend" set "TARGET=frontend"
if "%~1"=="--api" set "TARGET=api"
if "%~1"=="--ws" set "TARGET=ws"
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
echo   Professional Trading Platform - Shutdown Control
echo  ─────────────────────────────────────────────────────────────
echo.

echo [%date% %time%] Stopping services >> "%STOP_LOG%"

:: ── Step 1: Find and kill processes on known ports ──────────

set "STOPPED=0"
set "FAILED=0"

:: --- Frontend (5173) ---
if "%TARGET%"=="all" goto :stop_frontend
if "%TARGET%"=="frontend" goto :stop_frontend
goto :skip_frontend

:stop_frontend
echo  [1/3] Frontend (Port 5173)...
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    set "FOUND=1"
    if "%FORCE%"=="1" (
        taskkill /F /PID %%a >nul 2>&1
    ) else (
        taskkill /PID %%a >nul 2>&1
    )
    if not errorlevel 1 (
        echo         [OK] Stopped process PID %%a
        set /a STOPPED+=1
    ) else (
        echo         [!!] Failed to stop PID %%a
        set /a FAILED+=1
    )
)
if "!FOUND!"=="0" echo         [--] Not running
echo.
:skip_frontend

:: --- API (3001) ---
if "%TARGET%"=="all" goto :stop_api
if "%TARGET%"=="api" goto :stop_api
goto :skip_api

:stop_api
echo  [2/3] API Server (Port 3001)...
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do (
    set "FOUND=1"
    if "%FORCE%"=="1" (
        taskkill /F /PID %%a >nul 2>&1
    ) else (
        taskkill /PID %%a >nul 2>&1
    )
    if not errorlevel 1 (
        echo         [OK] Stopped process PID %%a
        set /a STOPPED+=1
    ) else (
        echo         [!!] Failed to stop PID %%a
        set /a FAILED+=1
    )
)
if "!FOUND!"=="0" echo         [--] Not running
echo.
:skip_api

:: --- WebSocket (3002) ---
if "%TARGET%"=="all" goto :stop_ws
if "%TARGET%"=="ws" goto :stop_ws
goto :skip_ws

:stop_ws
echo  [3/3] WebSocket Engine (Port 3002)...
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002 " ^| findstr "LISTENING" 2^>nul') do (
    set "FOUND=1"
    if "%FORCE%"=="1" (
        taskkill /F /PID %%a >nul 2>&1
    ) else (
        taskkill /PID %%a >nul 2>&1
    )
    if not errorlevel 1 (
        echo         [OK] Stopped process PID %%a
        set /a STOPPED+=1
    ) else (
        echo         [!!] Failed to stop PID %%a
        set /a FAILED+=1
    )
)
if "!FOUND!"=="0" echo         [--] Not running
echo.
:skip_ws

:: ── Step 2: Clean up orphaned node processes ────────────────

if "%TARGET%"=="all" (
    echo  [4/4] Cleaning up orphaned processes...
    
    :: Kill node processes that are children of this cmd window
    :: (from concurrently or individual npm scripts)
    for /f "tokens=2" %%a in ('tasklist /fi "IMAGENAME eq node.exe" /fo list ^| findstr "PID:" 2^>nul') do (
        :: Check if this PID's parent is a cmd process we own
        wmic process where "ParentProcessId=%%a" get Name 2>nul | findstr "cmd.exe" >nul 2>&1
        if not errorlevel 1 (
            :: Check if it's listening on our ports
            netstat -ano | findstr "%%a" | findstr "5173 3001 3002" >nul 2>&1
            if not errorlevel 1 (
                if "%FORCE%"=="1" (
                    taskkill /F /PID %%a >nul 2>&1
                ) else (
                    taskkill /PID %%a >nul 2>&1
                )
            )
        )
    )
    echo         [OK] Cleanup complete
    echo.
)

:: ── Step 3: Summary ────────────────────────────────────────

echo  ─────────────────────────────────────────────────────────────
if "!FAILED!"=="0" (
    echo   All services stopped successfully!
    echo   Stopped: !STOPPED! process(es)
) else (
    echo   Shutdown completed with warnings
    echo   Stopped: !STOPPED!  Failed: !FAILED!
    if "%FORCE%"=="0" (
        echo.
        echo   TIP: Use "stop.bat --force" to force-kill processes
    )
)
echo  ─────────────────────────────────────────────────────────────
echo.

echo [%date% %time%] Stopped !STOPPED! processes, !FAILED! failed >> "%STOP_LOG%"

endlocal
exit /b 0

:: ── Help ────────────────────────────────────────────────────

:show_help
echo  Usage: stop.bat [OPTIONS]
echo.
echo  Options:
echo    (none)       Stop all services gracefully
echo    --force, -f  Force-kill processes (SIGKILL equivalent)
echo    --frontend   Stop only the Vite frontend
echo    --api        Stop only the Express API
echo    --ws         Stop only the WebSocket engine
echo    --help, -h   Show this help message
echo.
echo  Examples:
echo    stop.bat              Stop everything gracefully
echo    stop.bat --force      Force-kill all services
echo    stop.bat --ws         Stop only WebSocket engine
echo.
endlocal
exit /b 0
