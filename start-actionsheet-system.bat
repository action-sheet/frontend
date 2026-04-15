@echo off
title Action Sheet System Startup
color 0A

echo ========================================
echo    ACTION SHEET SYSTEM STARTUP
echo ========================================
echo.

REM Check if backend is already running
echo [1/4] Checking if backend is already running...
netstat -ano | findstr :8080 >nul
if %errorlevel% == 0 (
    echo ✓ Backend already running on port 8080
) else (
    echo [1/4] Starting backend server...
    echo Starting Spring Boot backend...
    
    REM Change to your backend directory (UPDATE THIS PATH!)
    cd /d "E:\Action Sheet System\backend"
    
    REM Start backend in background (UPDATE THE JAR NAME!)
    start "Backend Server" java -jar actionsheet-backend.jar
    
    echo ✓ Backend server started
    timeout /t 10 /nobreak >nul
)

echo.
echo [2/4] Starting Cloudflare Tunnel...
echo Requesting new tunnel URL...

REM Start cloudflared and capture output
for /f "tokens=*" %%i in ('cloudflared tunnel --url http://localhost:8080 2^>^&1 ^| findstr "https://"') do (
    set TUNNEL_OUTPUT=%%i
)

REM Extract URL from output (it contains the full line, we need just the URL)
for /f "tokens=2 delims=|" %%a in ("%TUNNEL_OUTPUT%") do set FULL_URL=%%a
for /f "tokens=1" %%b in ("%FULL_URL%") do set TUNNEL_URL=%%b

REM Clean up the URL (remove extra spaces)
set TUNNEL_URL=%TUNNEL_URL: =%

echo.
echo [3/4] Tunnel created successfully!
echo ========================================
echo    🌐 YOUR NEW TUNNEL URL:
echo    %TUNNEL_URL%
echo ========================================
echo.

echo [4/4] Generating Vercel environment variable...
echo.
echo ========================================
echo    📋 COPY THIS TO VERCEL DASHBOARD:
echo ========================================
echo.
echo Variable Name: VITE_API_URL
echo Variable Value: %TUNNEL_URL%
echo.
echo Steps:
echo 1. Go to: https://vercel.com/your-account/frontend-rho-peach-62/settings/environment-variables
echo 2. Edit VITE_API_URL variable
echo 3. Paste this URL: %TUNNEL_URL%
echo 4. Save and redeploy
echo.
echo ========================================

REM Save URL to file for reference
echo %TUNNEL_URL% > tunnel-url.txt
echo ✓ URL saved to tunnel-url.txt

echo.
echo ✅ SYSTEM READY!
echo.
echo ⚠️  IMPORTANT: Keep this window open!
echo    Closing this window will stop the tunnel.
echo.
echo 🔄 After updating Vercel, your system will be fully operational.
echo.

REM Keep the tunnel running (this will show cloudflared logs)
echo Starting tunnel in foreground mode...
echo.
cloudflared tunnel --url http://localhost:8080

pause