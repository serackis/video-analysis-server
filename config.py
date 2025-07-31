"""
Configuration file for Video Analysis Server
"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent

# Flask Configuration
class Config:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # File upload settings
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or str(BASE_DIR / 'static' / 'videos')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    
    # Database settings
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or str(BASE_DIR / 'video_analysis.db')
    
    # Video processing settings
    PROCESSING_FRAME_INTERVAL = int(os.environ.get('PROCESSING_FRAME_INTERVAL', 5))  # Process every Nth frame
    THUMBNAIL_INTERVAL = int(os.environ.get('THUMBNAIL_INTERVAL', 100))  # Save thumbnail every Nth frame
    
    # Face detection settings
    FACE_DETECTION_MODEL = os.environ.get('FACE_DETECTION_MODEL', 'hog')  # 'hog' or 'cnn'
    FACE_DETECTION_UPSAMPLE = int(os.environ.get('FACE_DETECTION_UPSAMPLE', 1))
    
    # License plate detection settings
    LICENSE_PLATE_CONFIDENCE_THRESHOLD = float(os.environ.get('LICENSE_PLATE_CONFIDENCE_THRESHOLD', 0.5))
    LICENSE_PLATE_MIN_AREA = int(os.environ.get('LICENSE_PLATE_MIN_AREA', 1000))
    
    # Depersonalization settings
    FACE_BLUR_KERNEL_SIZE = int(os.environ.get('FACE_BLUR_KERNEL_SIZE', 99))
    FACE_BLUR_SIGMA = int(os.environ.get('FACE_BLUR_SIGMA', 30))
    PLATE_BLUR_KERNEL_SIZE = int(os.environ.get('PLATE_BLUR_KERNEL_SIZE', 99))
    PLATE_BLUR_SIGMA = int(os.environ.get('PLATE_BLUR_SIGMA', 30))
    
    # Video recording settings
    VIDEO_CODEC = os.environ.get('VIDEO_CODEC', 'mp4v')
    VIDEO_FPS = int(os.environ.get('VIDEO_FPS', 30))
    VIDEO_QUALITY = int(os.environ.get('VIDEO_QUALITY', 80))
    
    # Storage settings
    MAX_VIDEO_AGE_DAYS = int(os.environ.get('MAX_VIDEO_AGE_DAYS', 30))  # Auto-delete videos older than N days
    MAX_STORAGE_GB = float(os.environ.get('MAX_STORAGE_GB', 10.0))  # Max storage in GB
    
    # Network settings
    RTSP_TIMEOUT = int(os.environ.get('RTSP_TIMEOUT', 10))  # RTSP connection timeout in seconds
    RTSP_RETRY_ATTEMPTS = int(os.environ.get('RTSP_RETRY_ATTEMPTS', 3))
    RTSP_RETRY_DELAY = int(os.environ.get('RTSP_RETRY_DELAY', 5))  # Delay between retries in seconds
    
    # Web interface settings
    AUTO_REFRESH_INTERVAL = int(os.environ.get('AUTO_REFRESH_INTERVAL', 30))  # Auto-refresh interval in seconds
    MAX_VIDEOS_PER_PAGE = int(os.environ.get('MAX_VIDEOS_PER_PAGE', 20))
    
    # Security settings
    ENABLE_AUTHENTICATION = os.environ.get('ENABLE_AUTHENTICATION', 'False').lower() == 'true'
    ALLOWED_IPS = os.environ.get('ALLOWED_IPS', '').split(',') if os.environ.get('ALLOWED_IPS') else []
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE') or str(BASE_DIR / 'logs' / 'app.log')
    
    # Performance settings
    ENABLE_GPU_ACCELERATION = os.environ.get('ENABLE_GPU_ACCELERATION', 'False').lower() == 'true'
    MAX_CONCURRENT_STREAMS = int(os.environ.get('MAX_CONCURRENT_STREAMS', 5))
    
    # Notification settings
    ENABLE_EMAIL_NOTIFICATIONS = os.environ.get('ENABLE_EMAIL_NOTIFICATIONS', 'False').lower() == 'true'
    SMTP_SERVER = os.environ.get('SMTP_SERVER', '')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', '')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    ENABLE_AUTHENTICATION = True

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATABASE_PATH = ':memory:'
    UPLOAD_FOLDER = str(BASE_DIR / 'test_videos')

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment"""
    config_name = os.environ.get('FLASK_ENV', 'default')
    return config.get(config_name, config['default']) 