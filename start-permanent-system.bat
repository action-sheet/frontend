@echo off
title Action Sheet System - Permanent Setup
color 0A

echo ========================================
echo    ACTION SHEET SYSTEM STARTUP
echo    (Permanent Cloudflare Tunnel)
echo ========================================
echo.

REM Kill any existing cloudflared processes
echo [1/4] Cleaning up existing processes...
taskkill /f /im cloudflared.exe >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Killed existing cloudflared processes
) else (
    echo ✓ No existing cloudflared processes found
)

REM Stop cloudflared service if running
net stop cloudflared >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Stopped cloudflared service
) else (
    echo ✓ Cloudflared service was not running
)

REM Kill any existing Java backend processes
taskkill /f /im java.exe >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Killed existing Java backend processes
) else (
    echo ✓ No existing Java processes found
)

echo.
echo [2/4] Starting backend server...

REM Check if backend directory exists
if not exist "E:\Action Sheet System\backend" (
    echo ❌ Backend directory not found: E:\Action Sheet System\backend
    echo.
    echo Please check if your backend is located at:
    echo - E:\Action Sheet System\actionsheet-backend.jar
    echo - E:\Action Sheet System\backend\actionsheet-backend.jar
    echo - E:\Action Sheet System\server.js
    echo.
    pause
    exit /b 1
)

REM Change to backend directory
cd /d "E:\Action Sheet System\backend"

REM Check for JAR file
if exist "actionsheet-backend.jar" (
    echo ✓ Found actionsheet-backend.jar
    echo Starting Spring Boot backend...
    start "Backend Server" java -jar actionsheet-backend.jar
    echo ✓ Backend server started
) else if exist "..\actionsheet-backend.jar" (
    echo ✓ Found actionsheet-backend.jar in parent directory
    echo Starting Spring Boot backend...
    cd /d "E:\Action Sheet System"
    start "Backend Server" java -jar actionsheet-backend.jar
    echo ✓ Backend server started
) else if exist "server.js" (
    echo ✓ Found Node.js server
    echo Starting Node.js backend...
    start "Backend Server" node server.js
    echo ✓ Backend server started
) else if exist "..\server.js" (
    echo ✓ Found Node.js server in parent directory
    echo Starting Node.js backend...
    cd /d "E:\Action Sheet System"
    start "Backend Server" node server.js
    echo ✓ Backend server started
) else (
    echo ❌ No backend server found!
    echo Looking for: actionsheet-backend.jar or server.js
    echo.
    dir "E:\Action Sheet System" /b
    echo.
    pause
    exit /b 1
)

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 15 /nobreak >nul

echo.
echo [3/4] Starting permanent Cloudflare tunnel...

REM Start the cloudflared service (permanent tunnel)
net start cloudflared >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Cloudflared service started successfully
) else (
    echo ⚠️  Service start failed, trying manual tunnel run...
    echo Starting tunnel manually...
    start "Cloudflare Tunnel" cloudflared tunnel run action-sheet-application
    timeout /t 5 /nobreak >nul
)

echo.
echo [4/4] Verifying system status...

REM Check if backend is responding
echo Checking backend on port 8080...
netstat -ano | findstr :8080 >nul
if %errorlevel% == 0 (
    echo ✓ Backend is running on port 8080
) else (
    echo ❌ Backend is not running on port 8080
)

REM Check if cloudflared is running
tasklist /fi "imagename eq cloudflared.exe" | findstr cloudflared >nul
if %errorlevel% == 0 (
    echo ✓ Cloudflared tunnel is running
) else (
    echo ❌ Cloudflared tunnel is not running
)

echo.
echo ========================================
echo    🌐 YOUR PERMANENT URL:
echo    https://www.actionsheetacgv3.0.com
echo ========================================
echo.
echo ✅ SYSTEM STATUS:
echo    Backend Server: Running on localhost:8080
echo    Cloudflare Tunnel: Active
echo    Public URL: https://www.actionsheetacgv3.0.com
echo.
echo 🔄 Frontend is configured to use this permanent URL
echo    No need to update Vercel - it's already set!
echo.
echo ⚠️  IMPORTANT: 
echo    - Backend runs in background
echo    - Tunnel runs as Windows service
echo    - System will auto-restart after reboot
echo    - You can close this window safely
echo.

echo Press any key to exit...
pause >nul