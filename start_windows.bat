@echo off
REM Video Analysis Server - Windows Startup Script
REM This script activates the virtual environment and starts the server

echo ========================================
echo Video Analysis Server - Windows
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    py -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo Installing requirements...
python -m pip install -r requirements.txt

REM Start the server
echo.
echo Starting Video Analysis Server...
echo Web interface will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
python start.py

REM Keep window open if there was an error
if errorlevel 1 (
    echo.
    echo Server stopped with an error
    pause
)




