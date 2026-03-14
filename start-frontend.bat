@echo off
echo Starting SkyRequest Frontend...
cd /d "%~dp0frontend"
npm install
npm run dev
pause
