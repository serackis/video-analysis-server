#!/usr/bin/env python3
"""
Video Analysis Server Startup Script
Handles environment setup and launches the Flask application
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version.split()[0]}")

def check_dependencies():
    """Check if required system dependencies are installed"""
    print("🔍 Checking system dependencies...")
    
    # Check FFmpeg
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ FFmpeg is installed")
        else:
            print("❌ FFmpeg is not working properly")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("❌ FFmpeg is not installed")
        print("Please install FFmpeg:")
        if platform.system() == "Darwin":  # macOS
            print("  brew install ffmpeg")
        elif platform.system() == "Linux":
            print("  sudo apt install ffmpeg")
        else:  # Windows
            print("  Download from https://ffmpeg.org/download.html")
        return False
    
    return True

def setup_environment():
    """Setup environment variables and directories"""
    print("📁 Setting up environment...")
    
    # Create necessary directories
    directories = [
        'static/videos',
        'static/processed', 
        'static/thumbnails',
        'templates'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {directory}")

def install_python_dependencies():
    """Install Python dependencies if needed"""
    print("📦 Checking Python dependencies...")
    
    try:
        import flask
        import cv2
        import face_recognition
        import easyocr
        print("✅ All Python dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Installing dependencies from requirements.txt...")
        
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], 
                         check=True)
            print("✅ Dependencies installed successfully")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            return False

def main():
    """Main startup function"""
    print("🚀 Starting Video Analysis Server...")
    print("=" * 50)
    
    # Check Python version
    check_python_version()
    
    # Check system dependencies
    if not check_dependencies():
        print("\n❌ System dependencies check failed")
        print("Please install the required dependencies and try again")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Check Python dependencies
    if not install_python_dependencies():
        print("\n❌ Python dependencies check failed")
        print("Please install the required Python packages and try again")
        sys.exit(1)
    
    print("\n✅ All checks passed!")
    print("🌐 Starting Flask application...")
    print("📱 Web interface will be available at: http://localhost:5000")
    print("=" * 50)
    
    # Import and run the Flask app
    try:
        from app import app
        app.run(debug=True, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 