#!/usr/bin/env python3
"""
Video Analysis Server Startup Script
Handles environment setup and launches the Flask application
Cross-platform compatible with GPU acceleration support
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

# Import platform utilities
try:
    from platform_utils import platform_detector, gpu_accelerator, get_recommended_packages
except ImportError:
    print("⚠️  Platform utilities not available, using basic detection")
    platform_detector = None
    gpu_accelerator = None

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version.split()[0]}")

def check_system_info():
    """Display system information"""
    if platform_detector:
        info = platform_detector.get_platform_info()
        print(f"🖥️  System: {info['system']} {info['machine']}")
        print(f"🐍 Python: {info['python_version']}")
        print(f"💾 Architecture: {'64-bit' if info['is_64bit'] else '32-bit'}")
    else:
        print(f"🖥️  System: {platform.system()} {platform.machine()}")
        print(f"🐍 Python: {sys.version.split()[0]}")

def check_gpu_acceleration():
    """Check and display GPU acceleration information"""
    if gpu_accelerator:
        if gpu_accelerator.is_available():
            accel_type = gpu_accelerator.get_acceleration_type()
            print(f"🚀 GPU Acceleration: {accel_type}")
            
            if accel_type == "CUDA":
                gpu_info = platform_detector.detect_nvidia_gpu()
                if gpu_info and gpu_info['gpus']:
                    for i, gpu in enumerate(gpu_info['gpus']):
                        print(f"   📺 GPU {i+1}: {gpu['name']} ({gpu['memory_mb']}MB)")
                        print(f"   🔧 Driver: {gpu['driver_version']}")
            elif accel_type == "Metal":
                print("   📺 Apple Metal GPU detected")
        else:
            print("🚀 GPU Acceleration: Not available (CPU mode)")
    else:
        print("🚀 GPU Acceleration: Detection not available")

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
        if platform_detector:
            print(f"  {platform_detector.get_ffmpeg_install_command()}")
        else:
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
        'templates',
        'logs'
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
        import torch
        print("✅ All Python dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Installing dependencies from requirements.txt...")
        
        try:
            # Use the virtual environment Python if available
            python_cmd = sys.executable
            if os.path.exists('venv/Scripts/python.exe'):
                python_cmd = 'venv/Scripts/python.exe'
            elif os.path.exists('venv/bin/python'):
                python_cmd = 'venv/bin/python'
            
            subprocess.run([python_cmd, '-m', 'pip', 'install', '-r', 'requirements.txt'], 
                         check=True)
            print("✅ Dependencies installed successfully")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            return False

def install_platform_specific_packages():
    """Install platform-specific packages for optimal performance"""
    if not platform_detector:
        return
    
    print("🔧 Installing platform-specific packages...")
    packages = get_recommended_packages()
    
    if packages['platform_specific']:
        print("Installing platform-specific packages...")
        for package in packages['platform_specific']:
            try:
                python_cmd = sys.executable
                if os.path.exists('venv/Scripts/python.exe'):
                    python_cmd = 'venv/Scripts/python.exe'
                elif os.path.exists('venv/bin/python'):
                    python_cmd = 'venv/bin/python'
                
                subprocess.run([python_cmd, '-m', 'pip', 'install', package], 
                             check=True)
                print(f"✅ Installed: {package}")
            except subprocess.CalledProcessError:
                print(f"⚠️  Failed to install: {package}")
    
    if packages['gpu_acceleration']:
        print("Installing GPU acceleration packages...")
        for package in packages['gpu_acceleration']:
            try:
                python_cmd = sys.executable
                if os.path.exists('venv/Scripts/python.exe'):
                    python_cmd = 'venv/Scripts/python.exe'
                elif os.path.exists('venv/bin/python'):
                    python_cmd = 'venv/bin/python'
                
                subprocess.run([python_cmd, '-m', 'pip', 'install', package], 
                             check=True)
                print(f"✅ Installed: {package}")
            except subprocess.CalledProcessError:
                print(f"⚠️  Failed to install: {package}")

def main():
    """Main startup function"""
    print("🚀 Starting Video Analysis Server...")
    print("=" * 60)
    
    # Check Python version
    check_python_version()
    
    # Display system information
    check_system_info()
    
    # Check GPU acceleration
    check_gpu_acceleration()
    
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
    
    # Install platform-specific packages
    install_platform_specific_packages()
    
    print("\n✅ All checks passed!")
    print("🌐 Starting Flask application...")
    print("📱 Web interface will be available at: http://localhost:5000")
    print("=" * 60)
    
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