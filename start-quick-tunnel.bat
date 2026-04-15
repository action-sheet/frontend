@echo off
title Action Sheet System - Quick Tunnel
color 0A

echo ========================================
echo    ACTION SHEET SYSTEM STARTUP
echo    (Quick Tunnel - Simple Setup)
echo ========================================
echo.

REM Check if backend is running
echo [1/2] Checking backend server...
netstat -ano | findstr :8080 >nul
if %errorlevel% == 0 (
    echo ✓ Backend is running on port 8080
) else (
    echo ❌ Backend is not running on port 8080
    echo.
    echo Please start your backend server first:
    echo   cd /d "E:\backend"
    echo   java -jar actionsheet-backend.jar
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Starting Cloudflare Quick Tunnel...
echo This will give you a temporary URL that changes each restart.
echo.

REM Start quick tunnel
cloudflared tunnel --url http://localhost:8080

pause