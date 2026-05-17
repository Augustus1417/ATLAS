@echo off
REM ATLAS - Complete Setup Script for Windows

echo ======================================
echo ATLAS - AI PC Building Platform Setup
echo ======================================
echo.

REM Check if we're in the right directory
if not exist "atlas-backend" (
    echo Error: atlas-backend folder not found
    exit /b 1
)
if not exist "client" (
    echo Error: client folder not found
    exit /b 1
)

echo Setting up ATLAS Backend...
cd atlas-backend

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install backend dependencies
echo Installing backend dependencies...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file from example...
    copy example.env .env
)

echo.
echo Backend setup complete!
echo.
echo Setting up Frontend...
cd ..\client

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm install

echo.
echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo To start the application:
echo.
echo Terminal 1 (Backend):
echo   cd atlas-backend
echo   .venv\Scripts\activate
echo   python -m uvicorn main:app --reload
echo.
echo Terminal 2 (Frontend):
echo   cd client
echo   npm run dev
echo.
echo Then open: http://localhost:5173
echo.
pause
