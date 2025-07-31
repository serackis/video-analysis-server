// Video Analysis Server - Frontend JavaScript

class VideoAnalysisApp {
    constructor() {
        this.cameras = [];
        this.videos = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCameras();
        this.loadVideos();
        this.startAutoRefresh();
        this.initVideoUpload();
        
        // Start camera preview updates after initial load
        setTimeout(() => {
            this.updateCameraPreviews();
        }, 2000);
    }

    bindEvents() {
        // Camera form submission
        document.getElementById('cameraForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCamera();
        });

        // Video modal events
        const videoModal = document.getElementById('videoModal');
        videoModal.addEventListener('hidden.bs.modal', () => {
            const videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.pause();
            videoPlayer.src = '';
        });
    }

    async loadCameras() {
        try {
            const response = await fetch('/api/cameras');
            this.cameras = await response.json();
            this.renderCameras();
        } catch (error) {
            console.error('Error loading cameras:', error);
            this.showNotification('Error loading cameras', 'error');
        }
    }

    async loadVideos() {
        try {
            const response = await fetch('/api/videos');
            this.videos = await response.json();
            this.renderVideos();
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showNotification('Error loading videos', 'error');
        }
    }

    async addCamera() {
        const formData = {
            name: document.getElementById('cameraName').value,
            ip_address: document.getElementById('ipAddress').value,
            port: parseInt(document.getElementById('port').value) || 554,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            rtsp_path: document.getElementById('rtspPath').value || '/stream1'
        };

        this.showLoading(true);

        try {
            const response = await fetch('/api/cameras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Camera added successfully!', 'success');
                document.getElementById('cameraForm').reset();
                await this.loadCameras();
            } else {
                this.showNotification('Failed to add camera', 'error');
            }
        } catch (error) {
            console.error('Error adding camera:', error);
            this.showNotification('Error adding camera', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteCamera(cameraId) {
        if (!confirm('Are you sure you want to delete this camera?')) {
            return;
        }

        try {
            const response = await fetch(`/api/cameras/${cameraId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Camera deleted successfully!', 'success');
                await this.loadCameras();
            } else {
                this.showNotification('Failed to delete camera', 'error');
            }
        } catch (error) {
            console.error('Error deleting camera:', error);
            this.showNotification('Error deleting camera', 'error');
        }
    }

    renderCameras() {
        const camerasList = document.getElementById('camerasList');
        
        if (this.cameras.length === 0) {
            camerasList.innerHTML = '<p class="text-muted text-center">No cameras configured</p>';
            return;
        }

        camerasList.innerHTML = this.cameras.map(camera => `
            <div class="camera-item fade-in-up">
                <div class="camera-name">${camera.name}</div>
                <div class="camera-ip">${camera.ip_address}:${camera.port}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="camera-status ${camera.enabled ? 'status-active' : 'status-inactive'}">
                        ${camera.enabled ? 'Active' : 'Inactive'}
                    </span>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-primary" onclick="app.previewCamera(${camera.id})" title="Preview">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteCamera(${camera.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async previewCamera(cameraId) {
        try {
            const response = await fetch(`/api/stream/${cameraId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.showCameraPreviewModal(data);
            } else {
                this.showNotification(data.error || 'Failed to get camera stream', 'error');
            }
        } catch (error) {
            console.error('Error getting camera preview:', error);
            this.showNotification('Error connecting to camera', 'error');
        }
    }

    showCameraPreviewModal(cameraData) {
        const modal = new bootstrap.Modal(document.getElementById('cameraPreviewModal'));
        const videoElement = document.getElementById('cameraStream');
        const statusElement = document.getElementById('streamStatus');
        const infoElement = document.getElementById('cameraInfo');
        
        // Update camera info
        infoElement.innerHTML = `
            <div><strong>Name:</strong> ${cameraData.camera_name}</div>
            <div><strong>RTSP URL:</strong> <code>${cameraData.rtsp_url}</code></div>
            <div><strong>Status:</strong> <span class="badge bg-success">Online</span></div>
        `;
        
        // Show status
        statusElement.style.display = 'flex';
        statusElement.innerHTML = `
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span>Connecting to camera...</span>
        `;
        
        // Try to connect to RTSP stream
        videoElement.src = cameraData.rtsp_url;
        
        videoElement.onloadstart = () => {
            statusElement.innerHTML = `
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span>Loading stream...</span>
            `;
        };
        
        videoElement.oncanplay = () => {
            statusElement.style.display = 'none';
        };
        
        videoElement.onerror = () => {
            statusElement.innerHTML = `
                <i class="fas fa-exclamation-triangle text-warning"></i>
                <span>Failed to load stream. Trying snapshot...</span>
            `;
            this.loadCameraSnapshot(cameraData.camera_id);
        };
        
        // Bind control buttons
        this.bindCameraControls(cameraData.camera_id);
        
        modal.show();
    }

    async loadCameraSnapshot(cameraId) {
        try {
            const response = await fetch(`/api/stream/${cameraId}/snapshot`);
            if (response.ok) {
                const blob = await response.blob();
                const videoElement = document.getElementById('cameraStream');
                const statusElement = document.getElementById('streamStatus');
                
                // Create an image element to show the snapshot
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = 'w-100';
                img.style.maxHeight = '400px';
                img.style.objectFit = 'contain';
                
                // Replace video with image
                videoElement.style.display = 'none';
                videoElement.parentNode.insertBefore(img, videoElement);
                
                statusElement.style.display = 'none';
            } else {
                this.showNotification('Failed to capture snapshot', 'error');
            }
        } catch (error) {
            console.error('Error loading snapshot:', error);
            this.showNotification('Error capturing snapshot', 'error');
        }
    }

    bindCameraControls(cameraId) {
        const refreshBtn = document.getElementById('refreshStream');
        const snapshotBtn = document.getElementById('captureSnapshot');
        const recordingBtn = document.getElementById('toggleRecording');
        
        refreshBtn.onclick = () => {
            const videoElement = document.getElementById('cameraStream');
            videoElement.src = videoElement.src; // Reload stream
        };
        
        snapshotBtn.onclick = () => {
            this.captureSnapshot(cameraId);
        };
        
        recordingBtn.onclick = () => {
            this.toggleRecording(cameraId);
        };
    }

    async captureSnapshot(cameraId) {
        try {
            const response = await fetch(`/api/stream/${cameraId}/snapshot`);
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                // Create download link
                const a = document.createElement('a');
                a.href = url;
                a.download = `camera_${cameraId}_snapshot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                this.showNotification('Snapshot captured and downloaded!', 'success');
            } else {
                this.showNotification('Failed to capture snapshot', 'error');
            }
        } catch (error) {
            console.error('Error capturing snapshot:', error);
            this.showNotification('Error capturing snapshot', 'error');
        }
    }

    toggleRecording(cameraId) {
        const btn = document.getElementById('toggleRecording');
        const isRecording = btn.innerHTML.includes('Stop');
        
        if (isRecording) {
            btn.innerHTML = '<i class="fas fa-record-vinyl me-2"></i>Start Recording';
            btn.className = 'btn btn-info btn-sm';
            this.showNotification('Recording stopped', 'info');
        } else {
            btn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Recording';
            btn.className = 'btn btn-danger btn-sm';
            this.showNotification('Recording started', 'success');
        }
    }

    // Video upload and processing functionality
    initVideoUpload() {
        const uploadForm = document.getElementById('videoUploadForm');
        const processBtn = document.getElementById('processVideoBtn');
        
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadVideo();
        });
        
        processBtn.addEventListener('click', () => {
            this.processVideo();
        });
    }

    async uploadVideo() {
        const fileInput = document.getElementById('videoFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a video file', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('video', file);
        
        try {
            const response = await fetch('/api/upload-video', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showVideoInfo(data);
                this.showNotification('Video uploaded successfully!', 'success');
            } else {
                this.showNotification(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed', 'error');
        }
    }

    showVideoInfo(videoData) {
        this.currentVideo = videoData;
        
        const videoInfo = document.getElementById('videoInfo');
        const videoDetails = document.getElementById('videoDetails');
        
        videoDetails.innerHTML = `
            <div class="row">
                <div class="col-6">
                    <strong>Duration:</strong> ${videoData.duration.toFixed(2)}s<br>
                    <strong>FPS:</strong> ${videoData.fps.toFixed(2)}<br>
                    <strong>Frames:</strong> ${videoData.frame_count}
                </div>
                <div class="col-6">
                    <strong>Resolution:</strong> ${videoData.width}x${videoData.height}<br>
                    <strong>File:</strong> ${videoData.filename}<br>
                    <strong>Size:</strong> ${(fileInput.files[0].size / 1024 / 1024).toFixed(2)} MB
                </div>
            </div>
        `;
        
        videoInfo.style.display = 'block';
        
        // Show original video
        const originalVideo = document.getElementById('originalVideo');
        originalVideo.src = `/api/uploaded-video/${videoData.filename}`;
        document.getElementById('videoPlayerSection').style.display = 'block';
    }

    async processVideo() {
        if (!this.currentVideo) {
            this.showNotification('Please upload a video first', 'error');
            return;
        }
        
        const enableDepersonalization = document.getElementById('enableDepersonalization').checked;
        
        // Show progress
        const progressSection = document.getElementById('processingProgress');
        const progressBar = progressSection.querySelector('.progress-bar');
        const statusText = document.getElementById('processingStatus');
        
        progressSection.style.display = 'block';
        progressBar.style.width = '0%';
        statusText.textContent = 'Starting video processing...';
        
        try {
            const response = await fetch('/api/process-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: this.currentVideo.filename,
                    depersonalize: enableDepersonalization
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                progressBar.style.width = '100%';
                statusText.textContent = 'Processing completed!';
                
                // Show processed video
                const processedVideo = document.getElementById('processedVideo');
                processedVideo.src = `/api/processed-video/${data.processed_filename}`;
                
                this.showNotification('Video processed successfully!', 'success');
                
                // Hide progress after a delay
                setTimeout(() => {
                    progressSection.style.display = 'none';
                }, 3000);
            } else {
                statusText.textContent = data.error || 'Processing failed';
                this.showNotification(data.error || 'Processing failed', 'error');
            }
        } catch (error) {
            console.error('Processing error:', error);
            statusText.textContent = 'Processing failed';
            this.showNotification('Processing failed', 'error');
        }
    }

    renderVideos() {
        const videosGrid = document.getElementById('videosGrid');
        
        if (this.videos.length === 0) {
            videosGrid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No videos recorded yet</p></div>';
            return;
        }

        videosGrid.innerHTML = this.videos.map(video => `
            <div class="col-lg-4 col-md-6 col-sm-12">
                <div class="video-card fade-in-up">
                    <img src="/api/thumbnails/${video.filename.replace('.mp4', '.jpg')}" 
                         alt="Video thumbnail" 
                         class="video-thumbnail"
                         onclick="app.playVideo('${video.filename}')"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1ibmFpbDwvdGV4dD48L3N2Zz4='">
                    <div class="video-info">
                        <div class="video-title">${video.filename}</div>
                        <div class="video-meta">
                            <i class="fas fa-camera me-1"></i>
                            ${video.camera_name || 'Unknown Camera'}
                        </div>
                        <div class="video-stats">
                            <div class="stat-item">
                                <i class="fas fa-clock"></i>
                                ${this.formatDuration(video.duration)}
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-calendar"></i>
                                ${this.formatDate(video.created_at)}
                            </div>
                        </div>
                        <div class="video-stats">
                            <div class="stat-item">
                                <i class="fas fa-user"></i>
                                ${video.faces_detected} faces
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-car"></i>
                                ${video.plates_detected} plates
                            </div>
                        </div>
                        <div class="video-actions">
                            <button class="btn btn-sm btn-primary" onclick="app.playVideo('${video.filename}')">
                                <i class="fas fa-play me-1"></i>
                                Play
                            </button>
                            <button class="btn btn-sm btn-success" onclick="app.downloadVideo('${video.filename}')">
                                <i class="fas fa-download me-1"></i>
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    playVideo(filename) {
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.src = `/api/videos/${filename}`;
        
        const videoModal = new bootstrap.Modal(document.getElementById('videoModal'));
        videoModal.show();
    }

    downloadVideo(filename) {
        const link = document.createElement('a');
        link.href = `/api/videos/${filename}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'flex' : 'none';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadCameras();
            this.loadVideos();
        }, 30000);
        
        // Refresh camera previews every 10 seconds
        setInterval(() => {
            this.updateCameraPreviews();
        }, 10000);
    }

    async updateCameraPreviews() {
        if (this.cameras.length === 0) return;
        
        const previewPanel = document.getElementById('cameraPreview');
        if (!previewPanel) return;
        
        // Show loading state
        previewPanel.innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Updating camera previews...</p>
            </div>
        `;
        
        try {
            // Get snapshots for all cameras
            const previewPromises = this.cameras.map(async (camera) => {
                try {
                    const response = await fetch(`/api/stream/${camera.id}/snapshot`);
                    if (response.ok) {
                        const blob = await response.blob();
                        return {
                            camera,
                            snapshot: URL.createObjectURL(blob),
                            status: 'online'
                        };
                    } else {
                        return {
                            camera,
                            snapshot: null,
                            status: 'offline'
                        };
                    }
                } catch (error) {
                    return {
                        camera,
                        snapshot: null,
                        status: 'offline'
                    };
                }
            });
            
            const previews = await Promise.all(previewPromises);
            
            // Render preview grid
            previewPanel.innerHTML = `
                <div class="row">
                    ${previews.map(preview => `
                        <div class="col-md-6 mb-3">
                            <div class="camera-preview-item" onclick="app.previewCamera(${preview.camera.id})">
                                <div class="camera-preview-header">
                                    <h6 class="camera-preview-name">
                                        <span class="camera-preview-status status-${preview.status}"></span>
                                        ${preview.camera.name}
                                    </h6>
                                </div>
                                <div class="camera-preview-thumbnail">
                                    ${preview.snapshot ? 
                                        `<img src="${preview.snapshot}" alt="${preview.camera.name}" />` :
                                        `<i class="fas fa-video fa-2x"></i><br><small>No preview available</small>`
                                    }
                                </div>
                                <div class="camera-preview-actions">
                                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); app.previewCamera(${preview.camera.id})">
                                        <i class="fas fa-eye"></i> Preview
                                    </button>
                                    <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); app.captureSnapshot(${preview.camera.id})">
                                        <i class="fas fa-camera"></i> Snapshot
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error updating camera previews:', error);
            previewPanel.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p>Failed to load camera previews</p>
                </div>
            `;
        }
    }
}

// Initialize the application when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new VideoAnalysisApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (app) {
        app.showNotification('An unexpected error occurred', 'error');
    }
});

// Handle network errors
window.addEventListener('offline', () => {
    if (app) {
        app.showNotification('Network connection lost', 'warning');
    }
});

window.addEventListener('online', () => {
    if (app) {
        app.showNotification('Network connection restored', 'success');
        app.loadCameras();
        app.loadVideos();
    }
}); 