// Video Analysis Server - Frontend JavaScript

class VideoAnalysisApp {
    constructor() {
        this.cameras = [];
        this.videos = [];
        this.uploadedVideos = [];
        this.currentVideo = null;
        this.isBootstrapLoaded = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.isUploading = false;
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.checkBootstrapLoaded();
        this.bindEvents();
        this.loadCameras();
        // Only load videos if the videosGrid element exists
        if (document.getElementById('videosGrid')) {
            this.loadVideos();
        }
        this.loadUploadedVideos();
        this.startAutoRefresh();
        this.initVideoUpload();
        
        // Start camera preview updates after initial load
        setTimeout(() => {
            this.updateCameraPreviews();
        }, 2000);
    }

    checkBootstrapLoaded() {
        // Check if Bootstrap is loaded
        if (typeof bootstrap !== 'undefined') {
            this.isBootstrapLoaded = true;
            document.body.classList.add('bootstrap-loaded');
        } else {
            console.warn('Bootstrap not loaded, using fallback mode');
            this.isBootstrapLoaded = false;
        }
    }

    handleApiError(resource, error) {
        console.error(`Error loading ${resource}:`, error);
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`Retrying ${resource} (attempt ${this.retryCount}/${this.maxRetries})...`);
            
            setTimeout(() => {
                switch(resource) {
                    case 'cameras':
                        this.loadCameras();
                        break;
                    case 'videos':
                        // Only retry loading videos if the videosGrid element exists
                        if (document.getElementById('videosGrid')) {
                            this.loadVideos();
                        }
                        break;
                    case 'uploaded-videos':
                        this.loadUploadedVideos();
                        break;
                }
            }, 1000 * this.retryCount); // Exponential backoff
        } else {
            this.showNotification(`Failed to load ${resource} after ${this.maxRetries} attempts`, 'error');
            this.retryCount = 0; // Reset for next time
        }
    }

    bindEvents() {
        // Camera form submission - only if element exists
        const cameraForm = document.getElementById('cameraForm');
        if (cameraForm) {
            cameraForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addCamera();
            });
        }

        // Video modal events - only if element exists
        const videoModal = document.getElementById('videoModal');
        if (videoModal) {
            // Store the element that had focus before modal opened
            let previousActiveElement = null;
            
            videoModal.addEventListener('show.bs.modal', () => {
                // Store the currently focused element
                previousActiveElement = document.activeElement;
                
                // Remove any aria-hidden attributes that Bootstrap might add
                videoModal.removeAttribute('aria-hidden');
                
                // Use inert attribute instead of aria-hidden for better accessibility
                videoModal.removeAttribute('inert');
            });
            
            videoModal.addEventListener('shown.bs.modal', () => {
                // Focus the video player when modal is fully shown
                const videoPlayer = document.getElementById('videoPlayer');
                if (videoPlayer) {
                    videoPlayer.focus();
                }
            });
            
            videoModal.addEventListener('hide.bs.modal', () => {
                // Use inert attribute to prevent focus while hiding
                videoModal.setAttribute('inert', '');
            });
            
            videoModal.addEventListener('hidden.bs.modal', () => {
                const videoPlayer = document.getElementById('videoPlayer');
                if (videoPlayer) {
                    videoPlayer.pause();
                    videoPlayer.src = '';
                    videoPlayer.currentTime = 0;
                }
                
                // Remove inert attribute
                videoModal.removeAttribute('inert');
                
                // Restore focus to the previous element
                if (previousActiveElement && previousActiveElement.focus) {
                    previousActiveElement.focus();
                }
            });
        }

        // Video upload form - only if element exists
        const videoUploadForm = document.getElementById('videoUploadForm');
        if (videoUploadForm) {
            videoUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleVideoUpload();
            });
        }

        // Process Video button - only if element exists
        const processVideoBtn = document.getElementById('processVideoBtn');
        if (processVideoBtn) {
            processVideoBtn.addEventListener('click', () => {
                this.processVideo();
            });
        }
    }

    async loadCameras() {
        // Don't load cameras on the library page - it doesn't need camera data
        if (window.location.pathname === '/library') {
            console.log('Skipping cameras load on library page - not needed');
            return;
        }
        
        try {
            const response = await fetch('/api/cameras');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.cameras = await response.json();
            
            // Only render cameras if we're on a page that needs them
            if (document.getElementById('camerasList')) {
                this.renderCameras();
            }
            
            this.retryCount = 0; // Reset retry count on success
        } catch (error) {
            console.error('Error loading cameras:', error);
            this.handleApiError('cameras', error);
        }
    }

    async loadVideos() {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.videos = await response.json();
            
            // Only render videos if we're on a page that needs them
            if (document.getElementById('videosGrid')) {
                this.renderVideos();
            }
        } catch (error) {
            console.error('Error loading videos:', error);
            this.handleApiError('videos', error);
        }
    }

    async loadUploadedVideos() {
        // Don't load uploaded videos on the library page - it has its own loading logic
        if (window.location.pathname === '/library') {
            console.log('Skipping uploaded videos load on library page - using page-specific logic');
            return;
        }
        
        try {
            const response = await fetch('/api/uploaded-videos');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const videos = await response.json();
            this.uploadedVideos = videos;
            
            // Only render uploaded videos if we're on a page that needs them
            if (document.getElementById('uploadedVideosGrid')) {
                this.renderUploadedVideos();
            }
        } catch (error) {
            console.error('Error loading uploaded videos:', error);
            this.handleApiError('uploaded-videos', error);
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
        
        // Only render if the element exists (safety check for different pages)
        if (!camerasList) {
            return;
        }
        
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
        const modalElement = document.getElementById('cameraPreviewModal');
        const videoElement = document.getElementById('cameraStream');
        const statusElement = document.getElementById('streamStatus');
        const infoElement = document.getElementById('cameraInfo');
        
        // Safety check - only proceed if required elements exist
        if (!modalElement || !videoElement || !statusElement || !infoElement) {
            console.log('Camera preview modal elements not found on this page');
            this.showNotification('Camera preview not available on this page', 'warning');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        
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
            if (statusElement) {
                statusElement.innerHTML = `
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span>Loading stream...</span>
                `;
            }
        };
        
        videoElement.oncanplay = () => {
            if (statusElement) {
                statusElement.style.display = 'none';
            }
        };
        
        videoElement.onerror = () => {
            if (statusElement) {
                statusElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle text-warning"></i>
                    <span>Failed to load stream. Trying snapshot...</span>
                `;
            }
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
                
                // Safety check - only proceed if required elements exist
                if (!videoElement || !statusElement) {
                    console.log('Camera snapshot elements not found on this page');
                    return;
                }
                
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
        
        // Safety check - only proceed if required elements exist
        if (!refreshBtn || !snapshotBtn || !recordingBtn) {
            console.log('Camera control buttons not found on this page');
            return;
        }
        
        refreshBtn.onclick = () => {
            const videoElement = document.getElementById('cameraStream');
            if (videoElement) {
                videoElement.src = videoElement.src; // Reload stream
            }
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
        const fileInput = document.getElementById('videoFile');
        
        // Safety check - only proceed if required elements exist
        if (!videoInfo || !videoDetails) {
            console.log('Video info elements not found on this page');
            return;
        }
        
        videoDetails.innerHTML = `
            <div class="row">
                <div class="col-6">
                    <strong>Duration:</strong> ${videoData.duration?.toFixed(2) || 'Unknown'}s<br>
                    <strong>FPS:</strong> ${videoData.fps?.toFixed(2) || 'Unknown'}<br>
                    <strong>Frames:</strong> ${videoData.frame_count || 'Unknown'}
                </div>
                <div class="col-6">
                    <strong>Resolution:</strong> ${videoData.width || 0}x${videoData.height || 0}<br>
                    <strong>File:</strong> ${videoData.original_filename || 'Unknown'}<br>
                    <strong>Size:</strong> ${videoData.file_size ? (videoData.file_size / 1024 / 1024).toFixed(2) : 'Unknown'} MB
                </div>
            </div>
        `;
        
        videoInfo.style.display = 'block';
        
        // Show original video if elements exist
        const originalVideo = document.getElementById('originalVideo');
        const videoPlayerSection = document.getElementById('videoPlayerSection');
        
        if (originalVideo && videoPlayerSection) {
            originalVideo.src = `/api/uploaded-video/${videoData.filename}`;
            videoPlayerSection.style.display = 'block';
        }
    }

    async processVideo() {
        // Prevent duplicate submissions
        if (this.isProcessing) {
            console.log('Processing already in progress, ignoring duplicate request');
            return;
        }
        
        this.isProcessing = true;
        
        if (!this.currentVideo) {
            this.showNotification('Please upload a video first', 'error');
            this.isProcessing = false;
            return;
        }
        
        const enableDepersonalization = document.getElementById('enableDepersonalization');
        if (!enableDepersonalization) {
            console.log('Depersonalization checkbox not found on this page');
            return;
        }
        
        // Show progress section
        const processingProgressRow = document.getElementById('processingProgressRow');
        if (processingProgressRow) {
            processingProgressRow.style.display = 'block';
            console.log('Progress section shown');
        } else {
            console.error('Progress section not found!');
        }
        
        // Show progress - using correct element IDs from HTML template
        const progressBar = document.querySelector('#processingProgressRow .progress-bar');
        const progressText = document.getElementById('progressText');
        const statusText = document.getElementById('processingStatus');
        
        // Safety check for progress elements
        if (!progressBar || !progressText || !statusText) {
            console.log('Progress elements not found on this page');
            console.log('Missing elements:', { progressBar, progressText, statusText });
            this.showNotification('Progress display not available', 'warning');
            return;
        }
        
        console.log('Progress elements found successfully');
        console.log('Elements:', { progressBar, progressText, statusText });
        
        // Update progress display with proper attributes
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        progressText.textContent = '0%';
        statusText.textContent = 'Starting video processing...';
        
        console.log('Initial progress display set');
        
        try {
            // Update button to show loading state
            const processBtn = document.getElementById('processVideoBtn');
            if (processBtn) {
                const originalText = processBtn.innerHTML;
                processBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
                processBtn.disabled = true;
            }
            
            // Start processing
            const response = await fetch('/api/process-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: this.currentVideo.filename,
                    depersonalize: enableDepersonalization.checked
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Processing failed');
            }
            
            const data = await response.json();
            console.log('Process video response:', data);
            
            // Start progress polling
            console.log('Starting progress polling with filename:', data.processed_filename);
            this.startProgressPolling(data.processed_filename, progressBar, progressText, statusText, processingProgressRow);
            
        } catch (error) {
            console.error('Processing error:', error);
            if (statusText) {
                statusText.textContent = 'Processing failed';
            }
            this.showNotification('Processing failed', 'error');
        } finally {
            // Reset processing flag
            this.isProcessing = false;
            
            // Restore button state
            const processBtn = document.getElementById('processVideoBtn');
            if (processBtn) {
                processBtn.innerHTML = '<i class="fas fa-cogs me-2"></i>Process Video';
                processBtn.disabled = false;
            }
        }
    }

    startProgressPolling(processedFilename, progressBar, progressText, statusText, processingProgressRow) {
        console.log('Starting progress polling for:', processedFilename);
        console.log('Progress elements:', { progressBar, progressText, statusText, processingProgressRow });
        
        let progress = 0;
        let lastProgress = 0;
        const pollInterval = setInterval(async () => {
            try {
                // Simulate realistic progress updates
                if (progress < 90) {
                    // Gradual progress increase
                    progress += Math.random() * 8 + 2; // 2-10% increase per second
                    if (progress > 90) progress = 90; // Cap at 90% until completion
                }
                
                console.log(`Progress update: ${Math.round(progress)}%`);
                
                // Update progress bar with proper attributes
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', Math.round(progress));
                progressText.textContent = `${Math.round(progress)}%`;
                
                // Debug: Check if the DOM is actually updated
                console.log('Progress bar width set to:', progressBar.style.width);
                console.log('Progress text set to:', progressText.textContent);
                console.log('Progress bar element:', progressBar);
                
                // Update status text based on progress
                if (progress < 20) {
                    statusText.textContent = 'Initializing video processing...';
                } else if (progress < 40) {
                    statusText.textContent = 'Analyzing video content and detecting faces...';
                } else if (progress < 60) {
                    statusText.textContent = 'Processing license plates and objects...';
                } else if (progress < 80) {
                    statusText.textContent = 'Applying privacy protection and blurring...';
                } else if (progress < 90) {
                    statusText.textContent = 'Finalizing video encoding...';
                }
                
                // Check if processing is actually complete by trying to access the processed video
                try {
                    const checkResponse = await fetch(`/api/processed-video/${processedFilename}`);
                    if (checkResponse.ok) {
                        // Processing is complete
                        clearInterval(pollInterval);
                        
                        progressBar.style.width = '100%';
                        progressBar.setAttribute('aria-valuenow', 100);
                        progressText.textContent = '100%';
                        statusText.textContent = 'Processing completed successfully!';
                        
                        // Show processed video if elements exist
                        const processedVideo = document.getElementById('processedVideo');
                        if (processedVideo) {
                            processedVideo.src = `/api/processed-video/${processedFilename}`;
                        }
                        
                        this.showNotification('Video processed successfully!', 'success');
                        
                        // Hide progress after a delay
                        setTimeout(() => {
                            if (processingProgressRow) {
                                processingProgressRow.style.display = 'none';
                            }
                        }, 3000);
                        
                        return;
                    }
                } catch (checkError) {
                    // File not ready yet, continue polling
                }
                
                // If progress hasn't changed for a while, show "stuck" message
                if (Math.abs(progress - lastProgress) < 1) {
                    statusText.textContent = 'Processing in progress... Please wait';
                }
                lastProgress = progress;
                
            } catch (error) {
                console.error('Progress polling error:', error);
                clearInterval(pollInterval);
            }
        }, 800); // Poll every 800ms for smoother updates
        
        // Set a maximum polling time (10 minutes)
        setTimeout(() => {
            clearInterval(pollInterval);
            if (progress < 100) {
                statusText.textContent = 'Processing timeout - check server logs';
                this.showNotification('Processing timeout - check server logs', 'warning');
            }
        }, 600000); // 10 minutes
    }

    renderVideos() {
        const videosGrid = document.getElementById('videosGrid');
        
        // Check if the videosGrid element exists (it might be commented out in HTML)
        if (!videosGrid) {
            console.log('Videos grid element not found - Recorded Videos section may be commented out');
            return;
        }
        
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

    renderUploadedVideos() {
        const videosGrid = document.getElementById('uploadedVideosGrid');
        
        // Check if the uploadedVideosGrid element exists
        if (!videosGrid) {
            console.error('Uploaded videos grid element not found');
            return;
        }
        
        if (!this.uploadedVideos || this.uploadedVideos.length === 0) {
            videosGrid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No uploaded videos yet</p></div>';
            return;
        }

        videosGrid.innerHTML = this.uploadedVideos.map(video => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="video-card">
                    <div class="video-thumbnail">
                        <i class="fas fa-video"></i>
                        ${video.has_processed_version ? '<div class="processed-badge"><i class="fas fa-check-circle"></i></div>' : ''}
                    </div>
                    <div class="video-info">
                        <h6 class="video-title">${video.original_filename}</h6>
                        <p class="video-duration">Duration: ${this.formatDuration(video.duration)}</p>
                        <p class="video-date">${this.formatDate(video.uploaded_at)}</p>
                        <p class="video-resolution">${video.width}x${video.height} @ ${video.fps.toFixed(1)}fps</p>
                        <p class="video-size">${(video.file_size / 1024 / 1024).toFixed(2)} MB</p>
                        ${video.has_processed_version ? `
                            <div class="processed-info">
                                <span class="badge bg-success">Processed</span>
                                ${video.processed.depersonalized ? '<span class="badge bg-warning">Depersonalized</span>' : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="video-actions">
                        <button class="btn btn-primary btn-sm" onclick="app.playUploadedVideo('${video.stored_filename}')">
                            <i class="fas fa-play"></i> Play Original
                        </button>
                        ${video.has_processed_version ? `
                            <button class="btn btn-success btn-sm" onclick="app.playProcessedVideo('${video.processed.filename}')">
                                <i class="fas fa-eye"></i> Play Processed
                            </button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="app.deleteUploadedVideo(${video.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
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

    playUploadedVideo(filename) {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoModal = document.getElementById('videoModal');
        
        // Reset video player
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        videoPlayer.src = `/api/uploaded-video/${filename}`;
        
        // Show modal with proper accessibility
        const modal = new bootstrap.Modal(videoModal);
        modal.show();
        
        // Handle video loading errors
        videoPlayer.addEventListener('error', () => {
            this.showNotification('Error loading video. Please try again.', 'error');
        });
    }

    playProcessedVideo(filename) {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoModal = document.getElementById('videoModal');
        
        // Reset video player
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        videoPlayer.src = `/api/processed-video/${filename}`;
        
        // Show modal with proper accessibility
        const modal = new bootstrap.Modal(videoModal);
        modal.show();
        
        // Handle video loading errors
        videoPlayer.addEventListener('error', () => {
            this.showNotification('Error loading processed video. Please try again.', 'error');
        });
    }

    async deleteUploadedVideo(videoId) {
        if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/uploaded-videos/${videoId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Video deleted successfully!', 'success');
                await this.loadUploadedVideos();
            } else {
                this.showNotification('Failed to delete video', 'error');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            this.showNotification('Error deleting video', 'error');
        }
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
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
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
            // Only load videos if the videosGrid element exists
            if (document.getElementById('videosGrid')) {
                this.loadVideos();
            }
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

    async handleVideoUpload() {
        // Prevent duplicate submissions
        if (this.isUploading) {
            console.log('Upload already in progress, ignoring duplicate request');
            return;
        }
        
        this.isUploading = true;
        
        const fileInput = document.getElementById('videoFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a video file', 'warning');
            this.isUploading = false;
            return;
        }

        // Validate file type
        const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Please select a valid video file (MP4, AVI, MOV, MKV, WEBM)', 'warning');
            return;
        }

        // No file size limit - allow any size video
        console.log(`Uploading video: ${file.name} (${this.formatFileSize(file.size)})`);

        try {
            this.showNotification('Uploading video...', 'info');
            
            // Update button to show loading state
            const uploadBtn = document.querySelector('#videoUploadForm button[type="submit"]');
            if (uploadBtn) {
                const originalText = uploadBtn.innerHTML;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
                uploadBtn.disabled = true;
            }
            
            const formData = new FormData();
            formData.append('video', file);

            const response = await fetch('/api/upload-video', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Video uploaded successfully!', 'success');
                fileInput.value = ''; // Clear the input
                
                // Store the uploaded video data for processing
                if (result.video_info) {
                    this.currentVideo = result.video_info;
                    this.displayVideoInfo(result.video_info);
                }
                
                // Show processing controls
                this.showProcessingControls();
                
                // Refresh the uploaded videos list
                await this.loadUploadedVideos();
            } else {
                this.showNotification(result.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Video upload error:', error);
            this.showNotification(`Upload failed: ${error.message}`, 'error');
        } finally {
            // Reset upload flag
            this.isUploading = false;
            
            // Restore button state
            const uploadBtn = document.querySelector('#videoUploadForm button[type="submit"]');
            if (uploadBtn) {
                uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload Video';
                uploadBtn.disabled = false;
            }
        }
    }

    showProcessingControls() {
        const processingControls = document.getElementById('processingControls');
        const processingPlaceholder = document.getElementById('processingPlaceholder');
        
        if (processingControls && processingPlaceholder) {
            processingPlaceholder.style.display = 'none';
            processingControls.style.display = 'block';
        }
    }

    // Test method to manually test progress bar
    testProgressBar() {
        console.log('Testing progress bar...');
        
        const processingProgressRow = document.getElementById('processingProgressRow');
        const progressBar = document.querySelector('#processingProgressRow .progress-bar');
        const progressText = document.getElementById('progressText');
        const statusText = document.getElementById('processingStatus');
        
        console.log('Test - Found elements:', { processingProgressRow, progressBar, progressText, statusText });
        
        if (processingProgressRow) {
            processingProgressRow.style.display = 'block';
        }
        
        if (progressBar && progressText && statusText) {
            let progress = 0;
            const testInterval = setInterval(() => {
                progress += 10;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
                statusText.textContent = `Testing progress: ${progress}%`;
                
                console.log(`Test progress: ${progress}%`);
                
                if (progress >= 100) {
                    clearInterval(testInterval);
                    statusText.textContent = 'Test completed!';
                }
            }, 500);
        } else {
            console.error('Test failed - missing elements');
        }
    }

    displayVideoInfo(videoInfo) {
        console.log('Displaying video info:', videoInfo);
        
        const videoInfoCard = document.getElementById('videoInfoCard');
        if (!videoInfoCard) {
            console.log('Video info card not found on this page');
            return;
        }
        
        const infoContent = videoInfoCard.querySelector('.card-body');
        if (infoContent) {
            infoContent.innerHTML = `
                <div class="row">
                    <div class="col-6">
                        <strong>Filename:</strong><br>
                        <span class="text-muted">${videoInfo.filename || 'Unknown'}</span>
                    </div>
                    <div class="col-6">
                        <strong>Size:</strong><br>
                        <span class="text-muted">${this.formatFileSize(videoInfo.size || 0)}</span>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-6">
                        <strong>Duration:</strong><br>
                        <span class="text-muted">${this.formatDuration(videoInfo.duration || 0)}</span>
                    </div>
                    <div class="col-6">
                        <strong>Resolution:</strong><br>
                        <span class="text-muted">${videoInfo.width || 0} x ${videoInfo.height || 0}</span>
                    </div>
                </div>
            `;
            videoInfoCard.style.display = 'block';
            console.log('Video info card displayed successfully');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        if (seconds === 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
        
        // Only load data if we're on pages that need it
        if (document.getElementById('camerasList') && window.location.pathname !== '/library') {
            app.loadCameras();
        }
        if (document.getElementById('videosGrid') && window.location.pathname !== '/library') {
            app.loadVideos();
        }
        if (document.getElementById('uploadedVideosGrid') && window.location.pathname !== '/library') {
            app.loadUploadedVideos();
        }
    }
});

// Inert attribute polyfill for older browsers
if (!HTMLElement.prototype.hasOwnProperty('inert')) {
    Object.defineProperty(HTMLElement.prototype, 'inert', {
        get() {
            return this.hasAttribute('inert');
        },
        set(value) {
            if (value) {
                this.setAttribute('inert', '');
                this.setAttribute('tabindex', '-1');
                this.setAttribute('aria-hidden', 'true');
            } else {
                this.removeAttribute('inert');
                this.removeAttribute('tabindex');
                this.removeAttribute('aria-hidden');
            }
        }
    });
}

// Additional accessibility improvements
document.addEventListener('keydown', (event) => {
    // Escape key handling for modals
    if (event.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            const modalInstance = bootstrap.Modal.getInstance(openModal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
    }
});