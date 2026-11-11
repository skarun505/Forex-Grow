@echo off
title Quotex Pro Binary Trading Platform
echo ========================================================
echo   Starting Quotex Pro Binary Trading Platform
echo ========================================================
echo.
echo Starting Backend on http://localhost:4000 and ws://localhost:4000...
echo Starting Frontend on http://localhost:3000...
echo.
start "Quotex Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Quotex Frontend UI" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo Application started! Check your browser at http://localhost:3000
pause

