#!/usr/bin/env python3
"""
VLC Video Streamer for Testing Video Analysis Server
Uses VLC to stream video files as RTSP streams
"""

import os
import sys
import subprocess
import time
import argparse

def check_vlc():
    """Check if VLC is installed"""
    try:
        # Try different VLC paths on macOS
        vlc_paths = [
            '/Applications/VLC.app/Contents/MacOS/VLC',
            '/usr/local/bin/vlc',
            'vlc'
        ]
        
        for path in vlc_paths:
            result = subprocess.run([path, '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return path
        return None
    except:
        return None

def stream_with_vlc(video_path, rtsp_port=8554, stream_name="test"):
    """Stream video file using VLC"""
    vlc_path = check_vlc()
    if not vlc_path:
        print("❌ Error: VLC is not installed")
        print("Install VLC: brew install --cask vlc")
        return False
    
    if not os.path.exists(video_path):
        print(f"❌ Error: Video file not found: {video_path}")
        return False
    
    # VLC command to stream video as RTSP
    rtsp_url = f"rtsp://0.0.0.0:{rtsp_port}/{stream_name}"
    
    cmd = [
        vlc_path,
        video_path,
        '--intf', 'dummy',  # No GUI
        '--sout', f'#rtp{{dst=0.0.0.0,port={rtsp_port},mux=ts}}',
        '--sout-rtsp-host', '0.0.0.0',
        '--sout-rtsp-port', str(rtsp_port),
        '--loop',  # Loop the video
        '--repeat'  # Repeat when finished
    ]
    
    print(f"🎥 Starting VLC stream...")
    print(f"📁 Video file: {video_path}")
    print(f"🌐 RTSP URL: rtsp://localhost:{rtsp_port}/{stream_name}")
    print(f"🔗 For testing: rtsp://admin:password@localhost:{rtsp_port}/{stream_name}")
    
    try:
        process = subprocess.Popen(cmd)
        print(f"✅ VLC stream started! Process ID: {process.pid}")
        print(f"⏹️  Press Ctrl+C to stop the stream")
        
        # Keep running until interrupted
        while True:
            time.sleep(1)
            if process.poll() is not None:
                break
                
    except KeyboardInterrupt:
        print("\n⏹️  Stopping VLC stream...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        print("✅ Stream stopped")
    
    return True

def main():
    parser = argparse.ArgumentParser(description='VLC Video Streamer')
    parser.add_argument('video_path', help='Path to video file to stream')
    parser.add_argument('--port', type=int, default=8554, help='RTSP port (default: 8554)')
    parser.add_argument('--name', default='test', help='Stream name (default: test)')
    
    args = parser.parse_args()
    
    stream_with_vlc(args.video_path, args.port, args.name)

if __name__ == "__main__":
    main() 