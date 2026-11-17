@echo off
cd /d "%~dp0"
if not exist node_modules (call npm install)
:loop
node index.js
echo Gateway stopped. Restarting in 5 seconds...
timeout /t 5 >nul
goto loop
