#!/usr/bin/env python3
"""
Video Streamer for Testing Video Analysis Server
Converts recorded video files into RTSP streams for testing
"""

import os
import sys
import subprocess
import time
import threading
from pathlib import Path
import argparse

class VideoStreamer:
    def __init__(self, video_path, rtsp_port=8554, stream_name="test"):
        self.video_path = video_path
        self.rtsp_port = rtsp_port
        self.stream_name = stream_name
        self.process = None
        self.is_running = False
        
    def start_stream(self):
        """Start streaming the video file as RTSP stream"""
        if not os.path.exists(self.video_path):
            print(f"❌ Error: Video file not found: {self.video_path}")
            return False
            
        # Create RTSP URL
        rtsp_url = f"rtsp://localhost:{self.rtsp_port}/{self.stream_name}"
        
        print(f"🎥 Starting video stream...")
        print(f"📁 Video file: {self.video_path}")
        print(f"🌐 RTSP URL: {rtsp_url}")
        print(f"🔗 For testing: rtsp://admin:password@localhost:{self.rtsp_port}/{self.stream_name}")
        
        # FFmpeg command to stream video file as RTSP
        cmd = [
            'ffmpeg',
            '-re',  # Read input at native frame rate
            '-stream_loop', '-1',  # Loop the video infinitely
            '-i', self.video_path,
            '-c:v', 'libx264',  # Video codec
            '-c:a', 'aac',  # Audio codec
            '-f', 'rtsp',  # Output format
            '-rtsp_transport', 'tcp',  # Use TCP for RTSP
            f'rtsp://0.0.0.0:{self.rtsp_port}/{self.stream_name}'
        ]
        
        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            self.is_running = True
            
            print(f"✅ Stream started successfully!")
            print(f"📊 Process ID: {self.process.pid}")
            print(f"⏹️  Press Ctrl+C to stop the stream")
            
            # Monitor the process
            while self.is_running and self.process.poll() is None:
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n⏹️  Stopping stream...")
            self.stop_stream()
        except Exception as e:
            print(f"❌ Error starting stream: {e}")
            return False
            
        return True
    
    def stop_stream(self):
        """Stop the video stream"""
        self.is_running = False
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            print("✅ Stream stopped")
    
    def get_rtsp_url(self):
        """Get the RTSP URL for the stream"""
        return f"rtsp://admin:password@localhost:{self.rtsp_port}/{self.stream_name}"

def create_test_video():
    """Create a test video file with faces and text for testing"""
    print("🎬 Creating test video...")
    
    # FFmpeg command to create a test video with faces and text
    cmd = [
        'ffmpeg',
        '-f', 'lavfi',
        '-i', 'testsrc=duration=30:size=640x480:rate=30',
        '-f', 'lavfi',
        '-i', 'testsrc2=duration=30:size=640x480:rate=30',
        '-filter_complex', 
        '[0:v][1:v]overlay=10:10,drawtext=text=\'TEST123\':fontsize=60:fontcolor=white:x=50:y=50',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-t', '30',
        'test_video.mp4',
        '-y'
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print("✅ Test video created: test_video.mp4")
        return "test_video.mp4"
    except subprocess.CalledProcessError as e:
        print(f"❌ Error creating test video: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Video Streamer for Testing')
    parser.add_argument('video_path', nargs='?', help='Path to video file to stream')
    parser.add_argument('--port', type=int, default=8554, help='RTSP port (default: 8554)')
    parser.add_argument('--name', default='test', help='Stream name (default: test)')
    parser.add_argument('--create-test', action='store_true', help='Create a test video file')
    
    args = parser.parse_args()
    
    # Create test video if requested
    if args.create_test:
        video_path = create_test_video()
        if not video_path:
            return
    else:
        video_path = args.video_path
    
    # Check if video path is provided
    if not video_path:
        print("❌ Error: Please provide a video file path or use --create-test")
        print("Usage examples:")
        print("  python video_streamer.py video.mp4")
        print("  python video_streamer.py --create-test")
        print("  python video_streamer.py video.mp4 --port 8555 --name mystream")
        return
    
    # Check if FFmpeg is available
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Error: FFmpeg is not installed or not in PATH")
        print("Install FFmpeg: brew install ffmpeg")
        return
    
    # Start streaming
    streamer = VideoStreamer(video_path, args.port, args.name)
    
    try:
        streamer.start_stream()
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    main() 