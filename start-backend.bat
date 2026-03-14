@echo off
echo Starting SkyRequest Backend...
cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt --quiet
)

echo Backend starting on http://localhost:8000
venv\Scripts\python main.py
pause
