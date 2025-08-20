# Video Analysis Server - Windows PowerShell Startup Script
# This script activates the virtual environment and starts the server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Video Analysis Server - Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    try {
        py -m venv venv
        Write-Host "Virtual environment created successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create virtual environment: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
try {
    & "venv\Scripts\Activate.ps1"
    Write-Host "Virtual environment activated" -ForegroundColor Green
}
catch {
    Write-Host "Failed to activate virtual environment: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install/upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
try {
    python -m pip install --upgrade pip
    Write-Host "Pip upgraded successfully" -ForegroundColor Green
}
catch {
    Write-Host "Failed to upgrade pip: $_" -ForegroundColor Red
}

# Install requirements
Write-Host "Installing requirements..." -ForegroundColor Yellow
try {
    python -m pip install -r requirements.txt
    Write-Host "Requirements installed successfully" -ForegroundColor Green
}
catch {
    Write-Host "Failed to install requirements: $_" -ForegroundColor Red
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

# Start the server
Write-Host ""
Write-Host "Starting Video Analysis Server..." -ForegroundColor Green
Write-Host "Web interface will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    python start.py
}
catch {
    Write-Host ""
    Write-Host "Server stopped with an error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}




