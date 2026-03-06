@echo off
echo Starting Nyaya Legal AI System...
echo ===================================

echo [1/3] Starting AI Server (Port 8001)...
start "Nyaya AI Server (GPU)" cmd /k "cd /d %~dp0ai_model && .\venv_gpu\Scripts\python.exe inference_server.py"

echo [2/3] Starting Backend Server (Port 5000)...
start "Nyaya Backend" cmd /k "cd /d %~dp0nyaya-backend && node server.js"

echo [3/3] Starting Frontend Server (Port 3000)...
start "Nyaya Frontend" cmd /k "cd /d %~dp0nyaya-frontend && npm run dev"

echo.
echo All servers are starting up! 
echo Please wait about 15-20 seconds for the AI model to load into your GPU.
echo.
echo Once ready, access the app at: http://localhost:3000
echo.
pause
