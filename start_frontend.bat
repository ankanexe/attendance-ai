@echo off
echo.
echo  ============================================
echo   AttendAI — Starting Frontend Server
echo  ============================================
echo.
cd /d "%~dp0frontend"
echo  Installing Node.js dependencies...
npm install
echo.
echo  Starting Next.js frontend on http://localhost:3000
echo.
npm run dev
