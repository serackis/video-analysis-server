# Video Analysis Server

A comprehensive video analysis server that accepts RTSP video streams, performs real-time analysis (face detection, license plate detection), and applies depersonalization to protect privacy. The system includes a modern web interface for camera configuration and video management.

## Features

### 🎥 Video Processing
- **RTSP Stream Support**: Connect to IP cameras via RTSP protocol
- **Real-time Analysis**: Face detection and license plate recognition
- **Privacy Protection**: Automatic depersonalization of detected faces and license plates
- **Video Recording**: Continuous recording with metadata storage

### 🔍 Analysis Capabilities
- **Face Detection**: Using face_recognition library with high accuracy
- **License Plate Detection**: OCR-based detection using EasyOCR
- **Depersonalization**: Gaussian blur applied to sensitive content
- **Metadata Tracking**: Store detection counts and video information

### 🌐 Web Interface
- **Modern UI**: Responsive design with Bootstrap 5
- **Camera Management**: Add, configure, and remove RTSP cameras
- **Video Gallery**: Browse recorded videos with thumbnails
- **Real-time Updates**: Auto-refresh for live status updates
- **Video Player**: Built-in video playback with download capability

### 💾 Data Management
- **SQLite Database**: Lightweight storage for camera configs and video metadata
- **Organized Storage**: Structured file organization for videos and thumbnails
- **Search & Filter**: Easy video browsing with metadata

## Installation

### Prerequisites

- Python 3.8 or higher
- OpenCV dependencies
- FFmpeg (for video processing)

### System Dependencies

#### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install system dependencies
brew install cmake pkg-config
brew install ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y python3-pip python3-dev
sudo apt install -y cmake pkg-config
sudo apt install -y libopencv-dev python3-opencv
sudo apt install -y ffmpeg
```

#### Windows
- Install Visual Studio Build Tools
- Install FFmpeg from https://ffmpeg.org/download.html
- Add FFmpeg to system PATH

### Python Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd video-analysis-server
```

2. **Create virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

4. **Get sample videos for testing (optional)**
```bash
# Download a small sample video for testing
curl -o sample_video.mp4 "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4"

# Or use any MP4 file you have locally
# Copy it to the project root and rename it to sample_video.mp4
```

## Usage

### Starting the Server

1. **Activate virtual environment**
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Run the application**
```bash
python app.py
```

3. **Access the web interface**
Open your browser and navigate to: `http://localhost:5000`

### Adding Cameras

1. **Access the web interface**
2. **Fill in camera details**:
   - **Camera Name**: Descriptive name for the camera
   - **IP Address**: Camera's IP address (e.g., 192.168.1.100)
   - **Port**: RTSP port (default: 554)
   - **Username**: Camera login username
   - **Password**: Camera login password
   - **RTSP Path**: Stream path (e.g., /stream1, /live, /ch01)

3. **Click "Add Camera"**
The system will automatically start processing the stream and recording video.

### Common RTSP URL Formats

Different camera manufacturers use different RTSP paths:

- **Hikvision**: `rtsp://username:password@ip:port/Streaming/Channels/101`
- **Dahua**: `rtsp://username:password@ip:port/cam/realmonitor?channel=1&subtype=0`
- **Axis**: `rtsp://username:password@ip:port/axis-media/media.amp`
- **Generic**: `rtsp://username:password@ip:port/stream1`

### Viewing Videos

1. **Browse recorded videos** in the main interface
2. **Click on video thumbnails** to play in the modal player
3. **Download videos** using the download button
4. **View metadata** including detection counts and recording duration

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
FLASK_ENV=development
FLASK_DEBUG=1
UPLOAD_FOLDER=static/videos
MAX_CONTENT_LENGTH=16777216
```

### Database

The system uses SQLite for data storage. The database file (`video_analysis.db`) is created automatically on first run.

### File Structure

```
video-analysis-server/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/
│   └── index.html        # Main web interface
├── static/
│   ├── css/
│   │   └── style.css     # Custom styles
│   ├── js/
│   │   └── app.js        # Frontend JavaScript
│   ├── videos/           # Recorded video files
│   ├── processed/        # Processed video files
│   └── thumbnails/       # Video thumbnails
└── video_analysis.db     # SQLite database
```

## API Endpoints

### Cameras
- `GET /api/cameras` - Get all configured cameras
- `POST /api/cameras` - Add a new camera
- `DELETE /api/cameras/<id>` - Delete a camera

### Videos
- `GET /api/videos` - Get all recorded videos
- `GET /api/videos/<filename>` - Download a video file
- `GET /api/thumbnails/<filename>` - Get video thumbnail

## Performance Considerations

### Processing Optimization
- The system processes every 5th frame to balance performance and accuracy
- Face detection and license plate recognition are computationally intensive
- Consider using GPU acceleration for better performance

### Storage Management
- Videos are stored in MP4 format with H.264 encoding
- Implement a cleanup strategy for old videos
- Monitor disk space usage

### Network Considerations
- RTSP streams require stable network connectivity
- Consider bandwidth limitations when processing multiple streams
- Implement connection retry logic for network failures

## Troubleshooting

### Common Issues

1. **Camera Connection Failed**
   - Verify IP address and port
   - Check username/password
   - Ensure camera supports RTSP
   - Test RTSP URL with VLC player

2. **Face Detection Not Working**
   - Ensure good lighting conditions
   - Check camera resolution and quality
   - Verify face_recognition library installation

3. **License Plate Detection Issues**
   - Ensure plates are clearly visible
   - Check camera angle and distance
   - Verify EasyOCR installation

4. **Performance Issues**
   - Reduce processing frequency
   - Lower video resolution
   - Use GPU acceleration if available

### Logs and Debugging

Enable debug mode by setting `FLASK_DEBUG=1` in your environment variables.

Check the console output for error messages and processing status.

## Security Considerations

- **Network Security**: Use HTTPS in production
- **Authentication**: Implement user authentication for web interface
- **Access Control**: Restrict camera access to authorized users
- **Data Privacy**: Ensure compliance with privacy regulations
- **File Permissions**: Secure video storage directories

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Create an issue in the repository
4. Contact the development team

## System Architecture & Components

### 🔧 **Core Components**

#### **1. Flask Backend (`app.py`)**
The main application server that handles:
- **RTSP Stream Processing**: Connects to IP cameras and processes video streams
- **Computer Vision Pipeline**: Face detection, license plate recognition, and depersonalization
- **Database Management**: SQLite database for storing camera configs and video metadata
- **API Endpoints**: RESTful API for frontend communication
- **File Management**: Organized storage of videos, thumbnails, and processed content

#### **2. Video Processing Engine**
- **Frame Analysis**: Processes every 5th frame for optimal performance
- **Face Detection**: Uses `face_recognition` library with HOG (Histogram of Oriented Gradients) model
- **License Plate Detection**: OCR-based detection using EasyOCR with confidence thresholds
- **Depersonalization**: Gaussian blur applied to detected faces and license plates
- **Video Encoding**: MP4 format with H.264 codec for efficient storage

#### **3. Web Interface (`templates/index.html` + `static/js/app.js`)**
- **Responsive Design**: Bootstrap 5 framework with custom CSS styling
- **Real-time Updates**: Auto-refresh functionality for live status monitoring
- **Camera Management**: Intuitive forms for adding and configuring RTSP cameras
- **Video Gallery**: Grid-based layout with thumbnails and metadata display
- **Modal Video Player**: Built-in video playback with download capabilities

#### **4. Configuration Management (`config.py`)**
- **Environment-based Configuration**: Different settings for development, production, and testing
- **Customizable Parameters**: Processing intervals, detection thresholds, storage limits
- **Security Settings**: Authentication, IP restrictions, and access controls
- **Performance Tuning**: GPU acceleration, concurrent stream limits

### 🏗 **Data Flow Architecture**

```
RTSP Camera Streams
        ↓
   Flask Backend
        ↓
  Video Processing
        ↓
   Analysis Pipeline
        ↓
  Depersonalization
        ↓
   Storage & Database
        ↓
   Web Interface
        ↓
   User Interaction
```

### 📊 **Database Schema**

#### **Cameras Table**
```sql
CREATE TABLE cameras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER DEFAULT 554,
    username TEXT,
    password TEXT,
    rtsp_path TEXT DEFAULT '/stream1',
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Videos Table**
```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    camera_id INTEGER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration REAL,
    faces_detected INTEGER DEFAULT 0,
    plates_detected INTEGER DEFAULT 0,
    depersonalized BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras (id)
);
```

### 🔍 **Analysis Pipeline Details**

#### **Face Detection Process**
1. **Frame Capture**: Extract frames from RTSP stream
2. **Preprocessing**: Convert to RGB format for face_recognition library
3. **Detection**: Use HOG model to locate faces in the frame
4. **Bounding Box**: Extract coordinates of detected faces
5. **Depersonalization**: Apply Gaussian blur to face regions

#### **License Plate Detection Process**
1. **Image Preprocessing**: Convert to grayscale and apply noise reduction
2. **Contour Detection**: Find rectangular regions that could be license plates
3. **Aspect Ratio Filtering**: Filter contours based on typical license plate dimensions
4. **OCR Processing**: Use EasyOCR to extract text from candidate regions
5. **Confidence Filtering**: Only accept detections above threshold confidence
6. **Depersonalization**: Apply blur to confirmed license plate regions

#### **Depersonalization Techniques**
- **Gaussian Blur**: Primary method for obscuring sensitive content
- **Configurable Intensity**: Adjustable kernel size and sigma values
- **Selective Application**: Only blurs detected regions, preserving other content
- **Real-time Processing**: Applied during video recording for immediate privacy protection

### 🌐 **API Endpoints Reference**

#### **Camera Management**
- `GET /api/cameras` - Retrieve all configured cameras
- `POST /api/cameras` - Add new camera configuration
- `DELETE /api/cameras/<id>` - Remove camera configuration

#### **Video Management**
- `GET /api/videos` - Get all recorded videos with metadata
- `GET /api/videos/<filename>` - Download specific video file
- `GET /api/thumbnails/<filename>` - Retrieve video thumbnail

### 🔧 **Configuration Options**

#### **Processing Settings**
```env
PROCESSING_FRAME_INTERVAL=5          # Process every Nth frame
THUMBNAIL_INTERVAL=100               # Save thumbnail every Nth frame
FACE_DETECTION_MODEL=hog             # 'hog' or 'cnn'
FACE_DETECTION_UPSAMPLE=1            # Upsampling factor
```

#### **Detection Thresholds**
```env
LICENSE_PLATE_CONFIDENCE_THRESHOLD=0.5  # OCR confidence minimum
LICENSE_PLATE_MIN_AREA=1000             # Minimum contour area
```

#### **Depersonalization Settings**
```env
FACE_BLUR_KERNEL_SIZE=99              # Blur kernel size for faces
FACE_BLUR_SIGMA=30                    # Blur intensity for faces
PLATE_BLUR_KERNEL_SIZE=99             # Blur kernel size for plates
PLATE_BLUR_SIGMA=30                   # Blur intensity for plates
```

#### **Storage Management**
```env
MAX_VIDEO_AGE_DAYS=30                 # Auto-delete videos older than N days
MAX_STORAGE_GB=10.0                   # Maximum storage in GB
```

### 🚀 **Performance Optimization**

#### **Processing Efficiency**
- **Frame Skipping**: Process every 5th frame to reduce computational load
- **Multi-threading**: Concurrent processing of multiple camera streams
- **Memory Management**: Efficient frame handling and cleanup
- **GPU Acceleration**: Optional CUDA support for faster processing

#### **Storage Optimization**
- **Compressed Video**: H.264 encoding for efficient storage
- **Thumbnail Generation**: Reduced-size previews for quick browsing
- **Automatic Cleanup**: Configurable retention policies
- **Metadata Indexing**: Fast search and filtering capabilities

#### **Network Optimization**
- **Connection Pooling**: Reuse RTSP connections where possible
- **Timeout Handling**: Robust error recovery for network issues
- **Bandwidth Management**: Configurable quality settings
- **Retry Logic**: Automatic reconnection for dropped streams

### 🛡 **Security & Privacy Features**

#### **Data Protection**
- **Automatic Depersonalization**: Real-time blurring of sensitive content
- **Secure Storage**: Encrypted storage options for sensitive data
- **Access Control**: IP-based restrictions and authentication
- **Audit Logging**: Track all system activities and access

#### **Network Security**
- **HTTPS Support**: Secure web interface communication
- **API Authentication**: Token-based API access control
- **Input Validation**: Sanitize all user inputs
- **SQL Injection Protection**: Parameterized database queries

### 📈 **Monitoring & Analytics**

#### **System Metrics**
- **Processing Performance**: FPS, detection rates, processing times
- **Storage Usage**: Disk space, video counts, cleanup statistics
- **Network Status**: Connection health, bandwidth usage
- **Error Tracking**: Failed detections, connection issues

#### **Detection Analytics**
- **Face Detection Rates**: Success rates and confidence scores
- **License Plate Recognition**: OCR accuracy and detection patterns
- **Privacy Compliance**: Depersonalization effectiveness
- **Quality Metrics**: Video quality and processing efficiency

## Roadmap

- [ ] Real-time video streaming in web interface
- [ ] Advanced analytics dashboard
- [ ] Email/SMS alerts for detections
- [ ] Cloud storage integration
- [ ] Mobile app support
- [ ] Multi-language support
- [ ] Advanced depersonalization options
- [ ] Machine learning model training interface 