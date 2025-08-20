#!/bin/bash
# Video Analysis Server - Unix/Linux/macOS Startup Script
# This script activates the virtual environment and starts the server

echo "========================================"
echo "Video Analysis Server - Unix/Linux/macOS"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -f "venv/bin/activate" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade pip
echo "Upgrading pip..."
python -m pip install --upgrade pip

# Install requirements
echo "Installing requirements..."
python -m pip install -r requirements.txt

# Start the server
echo ""
echo "Starting Video Analysis Server..."
echo "Web interface will be available at: http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo ""

python start.py




