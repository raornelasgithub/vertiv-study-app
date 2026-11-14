@echo off
rem Double-click this file to test the app on this computer.
rem It starts a small web server and opens the app in your browser.
cd /d "%~dp0"
start "" http://localhost:8080/
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Port 8080
pause
