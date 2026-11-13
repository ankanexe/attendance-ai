@echo off
echo.
echo  ============================================
echo   AttendAI — Starting Backend Server
echo  ============================================
echo.
cd /d "%~dp0backend"
echo  Installing Python dependencies...
pip install -r requirements.txt -q
echo.
echo  Starting FastAPI backend on http://localhost:8000
echo  API Docs available at http://localhost:8000/docs
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
