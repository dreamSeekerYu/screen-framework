@echo off
cd /d "%~dp0"
echo ==============================================
echo Starting static file server...
echo Current serving directory: %cd%
echo ==============================================

echo [1/2] Checking http-server installation...
where http-server >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing http-server via domestic npm mirror...
    npm install -g http-server --registry=https://registry.npmmirror.com
)

echo [2/2] Starting server on port 8080...
echo Local access: http://localhost:8080
echo LAN access: Use your local IP + :8080
echo Press Ctrl+C or close this window to stop server.
echo.
timeout /t 2 /nobreak >nul
start "" http://localhost:8080
http-server -a 0.0.0.0 -p 8080 -c-1 --cors

pause