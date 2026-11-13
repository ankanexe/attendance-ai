@echo off
title AttendAI — AI Precision Launcher
echo.
echo ========================================================
echo   AttendAI — InsightFace ArcFace AI Edition
echo ========================================================
echo.

set PROJECT_ROOT=%~dp0

REM ── Install AI precision libraries if needed ─────────────────────────────
echo [AI CHECK] Verifying InsightFace + ONNX + MediaPipe installation...
python -c "import insightface" 2>nul
if errorlevel 1 (
    echo [AI INSTALL] InsightFace not found — installing AI libraries...
    echo This may take 3-5 minutes on first run (downloading model weights)
    python -m pip install insightface onnxruntime mediapipe
    echo [AI INSTALL] Done.
) else (
    echo [AI CHECK] InsightFace OK
)
echo.

echo [1/3] Starting Backend AI Server (FastAPI on Port 8000)...
start "AttendAI Backend" cmd /k "cd /d "%PROJECT_ROOT%backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Frontend Web Server (Next.js on Port 3000)...
start "AttendAI Frontend" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 6 /nobreak >nul

echo.
echo Opening AttendAI in browser...
start "" "http://localhost:3000"

echo.
echo ========================================================
echo   AttendAI is now RUNNING (InsightFace ArcFace Edition)
echo.
echo   Frontend:   http://localhost:3000
echo   Backend API: http://localhost:8000/docs
echo.
echo   NOTE: On first run, InsightFace downloads model weights
echo   (~350MB buffalo_s model). This is a one-time download.
echo   Face detection starts within ~10 seconds after backend loads.
echo ========================================================
echo.
echo Leave this window open, or minimize it.
pause
