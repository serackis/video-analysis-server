import os
import cv2
import numpy as np
import face_recognition
import easyocr
import json
import threading
import time
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sqlite3
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'static/videos'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('static/processed', exist_ok=True)
os.makedirs('static/thumbnails', exist_ok=True)

# Global variables for video processing
active_streams = {}
processing_threads = {}

# Initialize EasyOCR reader for license plate detection
reader = easyocr.Reader(['en'])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_database():
    """Initialize SQLite database with tables for camera configuration and video metadata"""
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    # Camera configuration table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cameras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            port INTEGER DEFAULT 554,
            username TEXT,
            password TEXT,
            rtsp_path TEXT DEFAULT '/stream1',
            enabled BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Video metadata table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS videos (
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
        )
    ''')
    
    conn.commit()
    conn.close()

def detect_faces(frame):
    """Detect faces in a frame and return bounding boxes"""
    face_locations = face_recognition.face_locations(frame)
    return face_locations

def detect_license_plates(frame):
    """Detect license plates in a frame using EasyOCR"""
    # Convert to grayscale for better OCR
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Apply some preprocessing to improve OCR
    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    plate_boxes = []
    
    for contour in contours:
        # Filter contours by area
        area = cv2.contourArea(contour)
        if area > 1000:  # Minimum area threshold
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter by aspect ratio (license plates are typically rectangular)
            aspect_ratio = w / h
            if 2.0 < aspect_ratio < 5.0:
                # Extract the region and try OCR
                roi = frame[y:y+h, x:x+w]
                if roi.size > 0:
                    results = reader.readtext(roi)
                    if results:
                        # Check if any detected text looks like a license plate
                        for (bbox, text, confidence) in results:
                            if confidence > 0.5 and len(text) >= 3:
                                plate_boxes.append((x, y, w, h, text, confidence))
    
    return plate_boxes

def depersonalize_frame(frame, face_locations, plate_boxes):
    """Apply depersonalization to faces and license plates"""
    depersonalized_frame = frame.copy()
    
    # Blur faces
    for (top, right, bottom, left) in face_locations:
        face_roi = depersonalized_frame[top:bottom, left:right]
        if face_roi.size > 0:
            # Apply strong Gaussian blur
            blurred_face = cv2.GaussianBlur(face_roi, (99, 99), 30)
            depersonalized_frame[top:bottom, left:right] = blurred_face
    
    # Blur license plates
    for (x, y, w, h, text, confidence) in plate_boxes:
        plate_roi = depersonalized_frame[y:y+h, x:x+w]
        if plate_roi.size > 0:
            # Apply strong Gaussian blur
            blurred_plate = cv2.GaussianBlur(plate_roi, (99, 99), 30)
            depersonalized_frame[y:y+h, x:x+w] = blurred_plate
    
    return depersonalized_frame

def process_video_stream(camera_id, rtsp_url, camera_name):
    """Process video stream from RTSP URL"""
    cap = cv2.VideoCapture(rtsp_url)
    
    if not cap.isOpened():
        print(f"Error: Could not open RTSP stream for camera {camera_name}")
        return
    
    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Create video writer for processed video
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"processed_{camera_name}_{timestamp}.mp4"
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_count = 0
    faces_detected = 0
    plates_detected = 0
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process every 5th frame to improve performance
            if frame_count % 5 == 0:
                # Detect faces
                face_locations = detect_faces(frame)
                faces_detected += len(face_locations)
                
                # Detect license plates
                plate_boxes = detect_license_plates(frame)
                plates_detected += len(plate_boxes)
                
                # Apply depersonalization
                processed_frame = depersonalize_frame(frame, face_locations, plate_boxes)
                
                # Draw detection boxes (for debugging)
                for (top, right, bottom, left) in face_locations:
                    cv2.rectangle(processed_frame, (left, top), (right, bottom), (0, 255, 0), 2)
                
                for (x, y, w, h, text, confidence) in plate_boxes:
                    cv2.rectangle(processed_frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
                    cv2.putText(processed_frame, f"Plate: {text}", (x, y - 10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            else:
                processed_frame = frame
            
            out.write(processed_frame)
            frame_count += 1
            
            # Save thumbnail every 100 frames
            if frame_count % 100 == 0:
                thumbnail_path = os.path.join('static/thumbnails', f"{camera_name}_{timestamp}.jpg")
                cv2.imwrite(thumbnail_path, processed_frame)
    
    except Exception as e:
        print(f"Error processing stream for camera {camera_name}: {str(e)}")
    
    finally:
        cap.release()
        out.release()
        
        # Save video metadata to database
        duration = frame_count / fps if fps > 0 else 0
        save_video_metadata(output_filename, camera_id, duration, faces_detected, plates_detected)

def save_video_metadata(filename, camera_id, duration, faces_detected, plates_detected):
    """Save video metadata to database"""
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO videos (filename, camera_id, duration, faces_detected, plates_detected, depersonalized)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (filename, camera_id, duration, faces_detected, plates_detected, True))
    
    conn.commit()
    conn.close()

@app.route('/')
def index():
    """Main page with video interface"""
    return render_template('index.html')

@app.route('/api/cameras', methods=['GET'])
def get_cameras():
    """Get all configured cameras"""
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM cameras ORDER BY created_at DESC')
    cameras = cursor.fetchall()
    
    conn.close()
    
    camera_list = []
    for camera in cameras:
        camera_list.append({
            'id': camera[0],
            'name': camera[1],
            'ip_address': camera[2],
            'port': camera[3],
            'username': camera[4],
            'password': camera[5],
            'rtsp_path': camera[6],
            'enabled': bool(camera[7]),
            'created_at': camera[8]
        })
    
    return jsonify(camera_list)

@app.route('/api/cameras', methods=['POST'])
def add_camera():
    """Add a new camera configuration"""
    data = request.json
    
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO cameras (name, ip_address, port, username, password, rtsp_path)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['name'], data['ip_address'], data['port'], data['username'], 
          data['password'], data['rtsp_path']))
    
    camera_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Start processing thread for this camera
    rtsp_url = f"rtsp://{data['username']}:{data['password']}@{data['ip_address']}:{data['port']}{data['rtsp_path']}"
    thread = threading.Thread(target=process_video_stream, 
                            args=(camera_id, rtsp_url, data['name']))
    thread.daemon = True
    thread.start()
    
    processing_threads[camera_id] = thread
    
    return jsonify({'success': True, 'camera_id': camera_id})

@app.route('/api/cameras/<int:camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    """Delete a camera configuration"""
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM cameras WHERE id = ?', (camera_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/videos', methods=['GET'])
def get_videos():
    """Get all recorded videos"""
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT v.*, c.name as camera_name 
        FROM videos v 
        LEFT JOIN cameras c ON v.camera_id = c.id 
        ORDER BY v.created_at DESC
    ''')
    videos = cursor.fetchall()
    
    conn.close()
    
    video_list = []
    for video in videos:
        video_list.append({
            'id': video[0],
            'filename': video[1],
            'camera_id': video[2],
            'camera_name': video[10],
            'start_time': video[3],
            'end_time': video[4],
            'duration': video[5],
            'faces_detected': video[6],
            'plates_detected': video[7],
            'depersonalized': bool(video[8]),
            'created_at': video[9]
        })
    
    return jsonify(video_list)

@app.route('/api/videos/<filename>')
def serve_recorded_video(filename):
    """Serve recorded video files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/thumbnails/<filename>')
def serve_thumbnail(filename):
    """Serve thumbnail images"""
    return send_from_directory('static/thumbnails', filename)

@app.route('/api/stream/<int:camera_id>')
def stream_preview(camera_id):
    """Stream live preview for a camera"""
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM cameras WHERE id = ?', (camera_id,))
    camera = cursor.fetchone()
    conn.close()
    
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404
    
    # Build RTSP URL
    rtsp_url = f"rtsp://{camera[4]}:{camera[5]}@{camera[2]}:{camera[3]}{camera[6]}"
    
    # Return the RTSP URL for the frontend to handle
    return jsonify({
        'camera_id': camera_id,
        'rtsp_url': rtsp_url,
        'camera_name': camera[1]
    })

@app.route('/api/stream/<int:camera_id>/snapshot')
def camera_snapshot(camera_id):
    """Get a snapshot from a camera"""
    conn = sqlite3.connect('video_analysis.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM cameras WHERE id = ?', (camera_id,))
    camera = cursor.fetchone()
    conn.close()
    
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404
    
    # Build RTSP URL
    rtsp_url = f"rtsp://{camera[4]}:{camera[5]}@{camera[2]}:{camera[3]}{camera[6]}"
    
    try:
        # Capture a frame from the RTSP stream
        cap = cv2.VideoCapture(rtsp_url)
        if not cap.isOpened():
            return jsonify({'error': 'Could not connect to camera'}), 500
        
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            return jsonify({'error': 'Could not capture frame'}), 500
        
        # Convert frame to JPEG
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        jpeg_data = buffer.tobytes()
        
        # Return the image
        from flask import Response
        return Response(jpeg_data, mimetype='image/jpeg')
        
    except Exception as e:
        return jsonify({'error': f'Error capturing snapshot: {str(e)}'}), 500

@app.route('/api/upload-video', methods=['POST'])
def upload_video():
    """Upload a video file for processing"""
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file:
        # Create uploads directory if it doesn't exist
        upload_dir = 'static/uploads'
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"upload_{timestamp}_{secure_filename(file.filename)}"
        filepath = os.path.join(upload_dir, filename)
        
        # Save the file
        file.save(filepath)
        
        # Get video info
        cap = cv2.VideoCapture(filepath)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        return jsonify({
            'success': True,
            'filename': filename,
            'filepath': filepath,
            'fps': fps,
            'frame_count': frame_count,
            'duration': duration,
            'width': width,
            'height': height
        })

@app.route('/api/process-video', methods=['POST'])
def process_video():
    """Process a video with depersonalization"""
    data = request.get_json()
    filename = data.get('filename')
    enable_depersonalization = data.get('depersonalize', True)
    
    if not filename:
        return jsonify({'error': 'No filename provided'}), 400
    
    filepath = os.path.join('static/uploads', filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'Video file not found'}), 404
    
    try:
        # Create processed videos directory
        processed_dir = 'static/processed'
        if not os.path.exists(processed_dir):
            os.makedirs(processed_dir)
        
        # Generate output filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_filename = f"processed_{timestamp}_{filename}"
        output_path = os.path.join(processed_dir, output_filename)
        
        # Process the video
        cap = cv2.VideoCapture(filepath)
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Create video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if enable_depersonalization:
                # Apply depersonalization
                face_locations = detect_faces(frame)
                plate_boxes = detect_license_plates(frame)
                frame = depersonalize_frame(frame, face_locations, plate_boxes)
            
            out.write(frame)
            frame_count += 1
            
            # Progress update every 10 frames
            if frame_count % 10 == 0:
                progress = (frame_count / total_frames) * 100
                print(f"Processing: {progress:.1f}%")
        
        cap.release()
        out.release()
        
        return jsonify({
            'success': True,
            'processed_filename': output_filename,
            'processed_path': output_path,
            'frame_count': frame_count,
            'depersonalized': enable_depersonalization
        })
        
    except Exception as e:
        return jsonify({'error': f'Error processing video: {str(e)}'}), 500

@app.route('/api/uploaded-video/<filename>')
def serve_uploaded_video(filename):
    """Serve uploaded video files"""
    return send_from_directory('static/uploads', filename)

@app.route('/api/processed-video/<filename>')
def serve_processed_video(filename):
    """Serve processed video files"""
    return send_from_directory('static/processed', filename)

if __name__ == '__main__':
    init_database()
    app.run(debug=True, host='0.0.0.0', port=5000) 