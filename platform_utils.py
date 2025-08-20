"""
Platform utilities for cross-platform compatibility and GPU acceleration detection
"""

import os
import platform
import subprocess
import sys
from typing import Dict, List, Optional, Tuple

class PlatformDetector:
    """Detect platform and available GPU acceleration options"""
    
    def __init__(self):
        self.system = platform.system()
        self.machine = platform.machine()
        self.python_version = sys.version_info
        self.is_windows = self.system == "Windows"
        self.is_macos = self.system == "Darwin"
        self.is_linux = self.system == "Linux"
        self.is_64bit = self.machine.endswith('64')
        
    def get_platform_info(self) -> Dict[str, str]:
        """Get comprehensive platform information"""
        return {
            'system': self.system,
            'machine': self.machine,
            'python_version': f"{self.python_version.major}.{self.python_version.minor}.{self.python_version.micro}",
            'is_64bit': self.is_64bit,
            'processor': platform.processor(),
            'platform': platform.platform()
        }
    
    def detect_nvidia_gpu(self) -> Optional[Dict[str, str]]:
        """Detect NVIDIA GPU and CUDA information on Windows/Linux"""
        if not (self.is_windows or self.is_linux):
            return None
            
        try:
            # Try to get NVIDIA GPU info using nvidia-smi
            result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and result.stdout.strip():
                lines = result.stdout.strip().split('\n')
                gpu_info = []
                for line in lines:
                    if line.strip():
                        parts = line.split(', ')
                        if len(parts) >= 3:
                            gpu_info.append({
                                'name': parts[0].strip(),
                                'memory_mb': int(parts[1].strip()) if parts[1].strip().isdigit() else 0,
                                'driver_version': parts[2].strip()
                            })
                
                if gpu_info:
                    return {
                        'type': 'NVIDIA',
                        'gpus': gpu_info,
                        'cuda_available': self._check_cuda_availability()
                    }
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError):
            pass
        
        return None
    
    def detect_apple_gpu(self) -> Optional[Dict[str, str]]:
        """Detect Apple GPU and Metal support on macOS"""
        if not self.is_macos:
            return None
            
        try:
            # Check for Metal support on macOS
            result = subprocess.run(['system_profiler', 'SPDisplaysDataType'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                output = result.stdout.lower()
                if 'metal' in output:
                    return {
                        'type': 'Apple',
                        'metal_support': True,
                        'mps_available': self._check_mps_availability()
                    }
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError):
            pass
        
        return None
    
    def _check_cuda_availability(self) -> bool:
        """Check if CUDA is available in the current Python environment"""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False
    
    def _check_mps_availability(self) -> bool:
        """Check if MPS (Metal Performance Shaders) is available"""
        try:
            import torch
            return hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()
        except ImportError:
            return False
    
    def get_recommended_packages(self) -> Dict[str, List[str]]:
        """Get recommended packages for the current platform"""
        packages = {
            'core': [
                'Flask==2.3.3',
                'Flask-CORS==4.0.0',
                'opencv-python==4.8.1.78',
                'opencv-contrib-python==4.8.1.78',
                'numpy==1.24.3',
                'Pillow==9.5.0',
                'face-recognition==1.3.0',
                'easyocr==1.7.0',
                'torch==2.0.1',
                'torchvision==0.15.2'
            ],
            'platform_specific': [],
            'gpu_acceleration': []
        }
        
        # Platform-specific packages
        if self.is_windows:
            packages['platform_specific'].extend([
                'pywin32==306'
            ])
        elif self.is_macos:
            packages['platform_specific'].extend([
                'pyobjc-framework-Cocoa==10.0'
            ])
        elif self.is_linux:
            packages['platform_specific'].extend([
                'python-xlib==0.33'
            ])
        
        # GPU acceleration packages
        nvidia_gpu = self.detect_nvidia_gpu()
        if nvidia_gpu and nvidia_gpu['cuda_available']:
            packages['gpu_acceleration'].extend([
                'torch==2.0.1+cu118 --index-url https://download.pytorch.org/whl/cu118',
                'torchvision==0.15.2+cu118 --index-url https://download.pytorch.org/whl/cu118',
                'opencv-python-cuda==4.8.1.78'
            ])
        
        apple_gpu = self.detect_apple_gpu()
        if apple_gpu and apple_gpu['mps_available']:
            packages['gpu_acceleration'].extend([
                'torch==2.0.1',
                'torchvision==0.15.2'
            ])
        
        return packages
    
    def get_ffmpeg_install_command(self) -> str:
        """Get the appropriate FFmpeg installation command for the platform"""
        if self.is_windows:
            return "Download from https://ffmpeg.org/download.html or use chocolatey: choco install ffmpeg"
        elif self.is_macos:
            return "brew install ffmpeg"
        elif self.is_linux:
            return "sudo apt install ffmpeg"
        else:
            return "Download from https://ffmpeg.org/download.html"

class GPUAccelerator:
    """GPU acceleration utilities for video processing"""
    
    def __init__(self, platform_detector: PlatformDetector):
        self.platform_detector = platform_detector
        self.gpu_info = None
        self._detect_gpu()
    
    def _detect_gpu(self):
        """Detect available GPU acceleration"""
        if self.platform_detector.is_windows or self.platform_detector.is_linux:
            self.gpu_info = self.platform_detector.detect_nvidia_gpu()
        elif self.platform_detector.is_macos:
            self.gpu_info = self.platform_detector.detect_apple_gpu()
    
    def is_available(self) -> bool:
        """Check if GPU acceleration is available"""
        return self.gpu_info is not None
    
    def get_acceleration_type(self) -> str:
        """Get the type of GPU acceleration available"""
        if not self.gpu_info:
            return "CPU"
        
        if self.gpu_info['type'] == 'NVIDIA':
            return "CUDA"
        elif self.gpu_info['type'] == 'Apple':
            return "Metal"
        else:
            return "CPU"
    
    def get_opencv_backend(self) -> str:
        """Get the recommended OpenCV backend for GPU acceleration"""
        if not self.gpu_info:
            return "CPU"
        
        if self.gpu_info['type'] == 'NVIDIA':
            return "CUDA"
        elif self.gpu_info['type'] == 'Apple':
            return "Metal"
        else:
            return "CPU"
    
    def get_torch_device(self) -> str:
        """Get the recommended PyTorch device for GPU acceleration"""
        if not self.gpu_info:
            return "cpu"
        
        if self.gpu_info['type'] == 'NVIDIA':
            return "cuda"
        elif self.gpu_info['type'] == 'Apple':
            return "mps"
        else:
            return "cpu"

# Global instances
platform_detector = PlatformDetector()
gpu_accelerator = GPUAccelerator(platform_detector)

def get_platform_info() -> Dict[str, str]:
    """Get platform information"""
    return platform_detector.get_platform_info()

def is_gpu_available() -> bool:
    """Check if GPU acceleration is available"""
    return gpu_accelerator.is_available()

def get_gpu_acceleration_type() -> str:
    """Get GPU acceleration type"""
    return gpu_accelerator.get_acceleration_type()

def get_recommended_packages() -> Dict[str, List[str]]:
    """Get recommended packages for current platform"""
    return platform_detector.get_recommended_packages()




