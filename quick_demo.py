#!/usr/bin/env python3
"""
Quick Demo: Video Streaming for Video Analysis Server
Simple demonstration of streaming video files on Mac
"""

import os
import subprocess
import time
import sys

def create_sample_video():
    """Create a simple sample video for testing"""
    print("🎬 Creating sample video...")
    
    cmd = [
        'ffmpeg',
        '-f', 'lavfi',
        '-i', 'testsrc=duration=10:size=640x480:rate=30',
        '-vf', 'drawtext=text=\'Sample Video\':fontsize=60:fontcolor=white:x=50:y=50',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-y',
        'sample_video.mp4'
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print("✅ Sample video created: sample_video.mp4")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to create sample video")
        return False

def stream_video_simple(video_path):
    """Simple video streaming using FFmpeg"""
    print(f"🎥 Starting simple video stream...")
    print(f"📁 Video: {video_path}")
    print(f"🌐 RTSP URL: rtsp://localhost:8554/test")
    print(f"🔗 For testing: rtsp://admin:password@localhost:8554/test")
    print()
    print("📋 Instructions:")
    print("1. Keep this terminal running")
    print("2. Open http://localhost:5001 in your browser")
    print("3. Add camera with RTSP URL: rtsp://admin:password@localhost:8554/test")
    print("4. Watch the video analysis in action!")
    print()
    print("⏹️  Press Ctrl+C to stop")
    
    cmd = [
        'ffmpeg',
        '-re',
        '-stream_loop', '-1',
        '-i', video_path,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-f', 'rtsp',
        '-rtsp_transport', 'tcp',
        'rtsp://0.0.0.0:8554/test'
    ]
    
    try:
        process = subprocess.Popen(cmd)
        print(f"✅ Stream started! Process ID: {process.pid}")
        
        while True:
            time.sleep(1)
            if process.poll() is not None:
                break
                
    except KeyboardInterrupt:
        print("\n⏹️  Stopping stream...")
        process.terminate()
        process.wait()
        print("✅ Stream stopped")

def main():
    print("🎥 Video Streaming Demo for Video Analysis Server")
    print("=" * 50)
    
    # Check if sample video exists, create if not
    if not os.path.exists('sample_video.mp4'):
        if not create_sample_video():
            return
    
    # Start streaming
    stream_video_simple('sample_video.mp4')

if __name__ == "__main__":
    main() 