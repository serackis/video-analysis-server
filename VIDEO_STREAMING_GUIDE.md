# 🎥 Video Streaming Guide for Mac

This guide shows you how to stream recorded video files on your Mac to test the Video Analysis Server.

## 📋 **Prerequisites**

### System Requirements
- macOS (tested on macOS 14+)
- FFmpeg (already installed)
- Python 3.8+ (already set up)
- Optional: VLC Media Player

### Install VLC (Optional)
```bash
brew install --cask vlc
```

## 🚀 **Method 1: FFmpeg Video Streamer (Recommended)**

### **Step 1: Create a Test Video**
```bash
# Create a test video with faces and text
python video_streamer.py --create-test
```

### **Step 2: Stream Your Own Video**
```bash
# Stream any video file
python video_streamer.py your_video.mp4

# Custom port and stream name
python video_streamer.py your_video.mp4 --port 8555 --name mystream
```

### **Step 3: Add Camera to Video Analysis Server**
1. Open your browser: `http://localhost:5001`
2. Add a new camera with these settings:
   - **Camera Name**: Test Stream
   - **IP Address**: localhost
   - **Port**: 8554 (or your custom port)
   - **Username**: admin
   - **Password**: password
   - **RTSP Path**: /test (or your custom stream name)

## 🎬 **Method 2: VLC Video Streamer**

### **Step 1: Stream with VLC**
```bash
# Stream a video file using VLC
python vlc_streamer.py your_video.mp4

# Custom settings
python vlc_streamer.py your_video.mp4 --port 8555 --name vlcstream
```

### **Step 2: Add to Video Analysis Server**
Use the same camera configuration as above.

## 📁 **Supported Video Formats**

### **Input Formats**
- MP4 (H.264, H.265)
- AVI
- MOV
- MKV
- WebM
- And many more (supported by FFmpeg)

### **Recommended Settings**
- **Resolution**: 720p or 1080p
- **Frame Rate**: 24-30 fps
- **Codec**: H.264
- **Duration**: 30 seconds to 10 minutes for testing

## 🔧 **Advanced Configuration**

### **Custom FFmpeg Streaming**
```bash
# High-quality stream
ffmpeg -re -stream_loop -1 -i video.mp4 \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  -f rtsp -rtsp_transport tcp \
  rtsp://0.0.0.0:8554/test

# Low-latency stream
ffmpeg -re -stream_loop -1 -i video.mp4 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f rtsp -rtsp_transport tcp \
  rtsp://0.0.0.0:8554/test
```

### **Multiple Streams**
```bash
# Terminal 1: Stream 1
python video_streamer.py video1.mp4 --port 8554 --name stream1

# Terminal 2: Stream 2
python video_streamer.py video2.mp4 --port 8555 --name stream2
```

## 🧪 **Testing Scenarios**

### **1. Face Detection Testing**
```bash
# Create video with faces
python video_streamer.py --create-test
# Add camera: rtsp://admin:password@localhost:8554/test
```

### **2. License Plate Testing**
```bash
# Use video with visible license plates
python video_streamer.py traffic_video.mp4
# Add camera: rtsp://admin:password@localhost:8554/test
```

### **3. Privacy Testing**
```bash
# Use video with people and sensitive information
python video_streamer.py privacy_test.mp4
# Check depersonalization in processed videos
```

## 📊 **Monitoring Streams**

### **Check Stream Status**
```bash
# Check if stream is running
lsof -i :8554

# Check FFmpeg processes
ps aux | grep ffmpeg

# Check VLC processes
ps aux | grep vlc
```

### **Test RTSP Stream**
```bash
# Test with VLC
vlc rtsp://localhost:8554/test

# Test with FFmpeg
ffmpeg -i rtsp://localhost:8554/test -t 10 test_output.mp4
```

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Find process using port
lsof -i :8554

# Kill process
kill -9 <PID>

# Or use different port
python video_streamer.py video.mp4 --port 8555
```

#### **2. Video File Not Found**
```bash
# Check file exists
ls -la your_video.mp4

# Use absolute path
python video_streamer.py /full/path/to/video.mp4
```

#### **3. FFmpeg Not Found**
```bash
# Install FFmpeg
brew install ffmpeg

# Check installation
ffmpeg -version
```

#### **4. VLC Not Found**
```bash
# Install VLC
brew install --cask vlc

# Check installation
/Applications/VLC.app/Contents/MacOS/VLC --version
```

### **Performance Optimization**

#### **Reduce CPU Usage**
```bash
# Lower quality stream
ffmpeg -re -stream_loop -1 -i video.mp4 \
  -c:v libx264 -preset ultrafast -crf 28 \
  -s 640x480 -r 15 \
  -f rtsp -rtsp_transport tcp \
  rtsp://0.0.0.0:8554/test
```

#### **Reduce Memory Usage**
```bash
# Limit buffer size
ffmpeg -re -stream_loop -1 -i video.mp4 \
  -c:v libx264 -preset ultrafast \
  -max_muxing_queue_size 1024 \
  -f rtsp -rtsp_transport tcp \
  rtsp://0.0.0.0:8554/test
```

## 📝 **Example Workflow**

### **Complete Testing Setup**

1. **Start Video Analysis Server**
   ```bash
   source venv/bin/activate
   python app.py
   ```

2. **Create Test Video**
   ```bash
   python video_streamer.py --create-test
   ```

3. **Add Camera in Web Interface**
   - Open: `http://localhost:5001`
   - Add camera with RTSP URL: `rtsp://admin:password@localhost:8554/test`

4. **Monitor Processing**
   - Watch the video gallery for processed videos
   - Check detection counts and metadata
   - Download processed videos for review

5. **Test Different Scenarios**
   ```bash
   # Test with different videos
   python video_streamer.py face_video.mp4
   python video_streamer.py license_plate_video.mp4
   python video_streamer.py privacy_video.mp4
   ```

## 🎯 **Best Practices**

### **Video Preparation**
- Use videos with clear faces for face detection testing
- Include readable license plates for OCR testing
- Test with various lighting conditions
- Use different video lengths (short and long)

### **Streaming Settings**
- Use TCP transport for better reliability
- Loop videos for continuous testing
- Monitor system resources during streaming
- Use appropriate quality settings for your hardware

### **Testing Strategy**
- Start with simple test videos
- Gradually increase complexity
- Test edge cases (no faces, poor lighting, etc.)
- Monitor processing performance
- Verify depersonalization effectiveness

## 🔗 **Useful Commands**

### **Quick Start Commands**
```bash
# Create and stream test video
python video_streamer.py --create-test

# Stream existing video
python video_streamer.py /path/to/video.mp4

# Multiple streams
python video_streamer.py video1.mp4 --port 8554 --name stream1 &
python video_streamer.py video2.mp4 --port 8555 --name stream2 &

# Stop all streams
pkill -f ffmpeg
pkill -f vlc
```

### **Monitoring Commands**
```bash
# Check active streams
lsof -i :8554
lsof -i :8555

# Monitor system resources
htop
top

# Check video analysis server logs
tail -f /path/to/logs/app.log
```

This guide provides everything you need to stream video files on your Mac for testing the Video Analysis Server. Start with the simple examples and gradually explore more advanced configurations as needed. 