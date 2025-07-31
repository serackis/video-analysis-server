#!/usr/bin/env python3
"""
Test script for Video Analysis Server
Verifies that all components are working correctly
"""

import sys
import os
import cv2
import numpy as np
from pathlib import Path

def test_opencv():
    """Test OpenCV installation"""
    print("🔍 Testing OpenCV...")
    try:
        # Test basic OpenCV functionality
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        cv2.rectangle(img, (10, 10), (90, 90), (255, 255, 255), 2)
        
        # Test video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter('test_video.mp4', fourcc, 20.0, (100, 100))
        out.write(img)
        out.release()
        
        # Clean up test file
        if os.path.exists('test_video.mp4'):
            os.remove('test_video.mp4')
        
        print("✅ OpenCV is working correctly")
        return True
    except Exception as e:
        print(f"❌ OpenCV test failed: {e}")
        return False

def test_face_recognition():
    """Test face recognition library"""
    print("🔍 Testing face recognition...")
    try:
        import face_recognition
        
        # Create a test image with a simple pattern
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        # Add some features that might be detected as faces
        cv2.rectangle(img, (20, 20), (80, 80), (255, 255, 255), -1)
        cv2.circle(img, (35, 35), 5, (0, 0, 0), -1)
        cv2.circle(img, (65, 35), 5, (0, 0, 0), -1)
        cv2.rectangle(img, (40, 50), (60, 70), (0, 0, 0), -1)
        
        # Test face detection
        face_locations = face_recognition.face_locations(img)
        print(f"✅ Face recognition working - detected {len(face_locations)} faces")
        return True
    except Exception as e:
        print(f"❌ Face recognition test failed: {e}")
        return False

def test_easyocr():
    """Test EasyOCR library"""
    print("🔍 Testing EasyOCR...")
    try:
        import easyocr
        
        # Initialize reader
        reader = easyocr.Reader(['en'])
        
        # Create a test image with text
        img = np.ones((100, 300, 3), dtype=np.uint8) * 255
        cv2.putText(img, 'TEST123', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        
        # Test OCR
        results = reader.readtext(img)
        print(f"✅ EasyOCR working - detected {len(results)} text regions")
        return True
    except Exception as e:
        print(f"❌ EasyOCR test failed: {e}")
        return False

def test_flask():
    """Test Flask installation"""
    print("🔍 Testing Flask...")
    try:
        from flask import Flask
        app = Flask(__name__)
        print("✅ Flask is working correctly")
        return True
    except Exception as e:
        print(f"❌ Flask test failed: {e}")
        return False

def test_database():
    """Test database functionality"""
    print("🔍 Testing database...")
    try:
        import sqlite3
        
        # Test database creation
        conn = sqlite3.connect(':memory:')
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE test (
                id INTEGER PRIMARY KEY,
                name TEXT
            )
        ''')
        
        cursor.execute('INSERT INTO test (name) VALUES (?)', ('test',))
        cursor.execute('SELECT * FROM test')
        result = cursor.fetchone()
        
        conn.close()
        
        if result and result[1] == 'test':
            print("✅ Database functionality working")
            return True
        else:
            print("❌ Database test failed")
            return False
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_directories():
    """Test directory creation"""
    print("🔍 Testing directory structure...")
    try:
        directories = [
            'static/videos',
            'static/processed',
            'static/thumbnails',
            'templates'
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
            if not os.path.exists(directory):
                print(f"❌ Failed to create directory: {directory}")
                return False
        
        print("✅ Directory structure created successfully")
        return True
    except Exception as e:
        print(f"❌ Directory test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Running Video Analysis Server Tests...")
    print("=" * 50)
    
    tests = [
        test_opencv,
        test_face_recognition,
        test_easyocr,
        test_flask,
        test_database,
        test_directories
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The system is ready to use.")
        print("\n🚀 You can now start the server with:")
        print("   python start.py")
        return True
    else:
        print("❌ Some tests failed. Please check the errors above.")
        print("\n💡 Common solutions:")
        print("   - Install missing dependencies: pip install -r requirements.txt")
        print("   - Install system dependencies (FFmpeg, etc.)")
        print("   - Check Python version (3.8+ required)")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 