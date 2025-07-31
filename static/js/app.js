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
                    <button class="btn btn-sm btn-danger" onclick="app.deleteCamera(${camera.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
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