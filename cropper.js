/**
 * ImageCropperApp
 * A class to encapsulate all logic for the image cropping tool.
 * This improves organization, maintainability, and prevents global scope pollution.
 */
class ImageCropperApp {
    constructor() {
        this._selectElements();
        this._initState();
        this._initEventListeners();
        this._initialSetup();
    }

    /**
     * Caches all necessary DOM elements for the application.
     */
    _selectElements() {
        this.imageUpload = document.getElementById('image-upload');
        this.fileNameSpan = document.getElementById('file-name');
        this.sizeInput = document.getElementById('size-input');
        this.squareBtn = document.getElementById('square-btn');
        this.circleBtn = document.getElementById('circle-btn');
        this.cropButton = document.getElementById('cropButton');
        this.imageContainer = document.getElementById('image-container');
        this.originalImage = document.getElementById('original-image');
        this.cropper = document.getElementById('cropper');
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.outputContainer = document.getElementById('output-container');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.downloadBtn = document.getElementById('download-btn');
    }

    /**
     * Initializes the state variables for the application.
     */
    _initState() {
        this.imageLoaded = false;
        this.dragging = false;
        this.currentScale = 1.0;
        this.minScale = 1.0;
        this.imageX = 0;
        this.imageY = 0;
        this.startX = 0;
        this.startY = 0;
        this.startImageX = 0;
        this.startImageY = 0;
        this.sourceImage = null; // To hold the original Image object for canvas drawing
        this.initialPinchDistance = 0;
        this.cropperShape = 'square';
        this.requestedSize = 300; // To store the user's desired output resolution
    }

    /**
     * Sets up all event listeners for the application.
     * Uses .bind(this) to ensure 'this' context is correct inside event handlers.
     */
    _initEventListeners() {
        this.imageUpload.addEventListener('change', this.handleImageUpload.bind(this));
        this.sizeInput.addEventListener('change', () => {
            this.updateCropperSize(() => {
                if (this.imageLoaded) this.initializeCropper();
            });
        });
        this.squareBtn.addEventListener('click', () => this.setCropperShape('square'));
        this.circleBtn.addEventListener('click', () => this.setCropperShape('circle'));
        this.zoomInBtn.addEventListener('click', () => this.zoom(1.1));
        this.zoomOutBtn.addEventListener('click', () => this.zoom(0.9));
        this.imageContainer.addEventListener('wheel', this.handleWheelZoom.bind(this), { passive: false });
        this.imageContainer.addEventListener('mousedown', this.startDrag.bind(this));
        this.imageContainer.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
        this.cropButton.addEventListener('click', this.cropImage.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadCroppedImage.bind(this));
    }

    /**
     * Performs initial setup on application start.
     */
    _initialSetup() {
        // This block establishes a clean and reliable coordinate system for all positioning and transformations.
        // This is the definitive fix for all reported issues (image at bottom-right, no movement, no zoom).

        // 1. The container becomes the coordinate system's origin.
        this.imageContainer.style.position = 'relative';

        // 2. The image is positioned absolutely within the container.
        this.originalImage.style.position = 'absolute';

        // 3. The cropper frame allows mouse/touch events to pass through to the image below.
        this.cropper.style.pointerEvents = 'none';

        // 4. Set the transform origin to the top-left corner for predictable scaling.
        // This unifies the visual scaling behavior with the coordinate calculation logic.
        this.originalImage.style.transformOrigin = 'top left';

        // Initialize on load
        this.updateCropperSize();
        this.setCropperShape('square');
    }

    // --- Core Methods ---

    getRelativeCoords(e) {
        const containerRect = this.imageContainer.getBoundingClientRect();
        // Handle both mouse and touch events
        const point = e.touches ? e.touches[0] : e;
        return {
            x: point.clientX - containerRect.left,
            y: point.clientY - containerRect.top
        };
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.sourceImage = new Image();
                this.sourceImage.onload = () => {
                    this.originalImage.src = event.target.result;
                    this.imageContainer.classList.remove('hidden');
                    this.outputContainer.classList.add('hidden');
                    // Defer initialization to the next animation frame
                    // This ensures the cropper size is updated BEFORE we calculate image positions.
                    this.updateCropperSize(this.initializeCropper.bind(this));
                };
                this.sourceImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
            this.fileNameSpan.textContent = file.name;
        }
    }

    resetImageState() {
        this.currentScale = 1.0;
        this.imageX = 0;
        this.imageY = 0;
    }

    initializeCropper() {
        // This function now assumes the cropper's size has just been set correctly.
        // It calculates the initial scale and position of the image.
        this.resetImageState();

        // Read the just-updated dimensions of the cropper.
        // Use getBoundingClientRect for floating-point precision to avoid rounding errors.
        const containerRect = this.imageContainer.getBoundingClientRect();
        const cropperRect = this.cropper.getBoundingClientRect();
        const cropperWidth = cropperRect.width;
        const cropperHeight = cropperRect.height;
        const cropperX = cropperRect.left - containerRect.left;
        const cropperY = cropperRect.top - containerRect.top;

        // Calculate minimum scale to fit the image within the cropper
        const scaleX = cropperWidth / this.sourceImage.width;
        const scaleY = cropperHeight / this.sourceImage.height;
        // 最小スケールは、画像がトリミング枠全体を常に覆う（カバーする）値に設定します。
        // これにより、ズームアウトしすぎて枠内に余白ができるのを防ぎます。
        this.minScale = Math.max(scaleX, scaleY);
        this.currentScale = this.minScale;

        // Center the image inside the cropper area initially
        this.imageX = cropperX + (cropperWidth - this.sourceImage.width * this.currentScale) / 2;
        this.imageY = cropperY + (cropperHeight - this.sourceImage.height * this.currentScale) / 2;

        // Enforce bounds after initial positioning
        this.enforceBounds();
        this.updateImageTransform();

        this.imageLoaded = true;
    }

    updateCropperSize(callback) {
        const size = parseInt(this.sizeInput.value, 10);
        if (isNaN(size) || size <= 0) {
            if (callback) callback();
            return;
        }

        // Store the user's desired output size
        this.requestedSize = size;

        // The visual size of the cropper should not exceed the container's width.
        // Use requestAnimationFrame to ensure clientWidth is calculated after any layout changes.
        requestAnimationFrame(() => {
            const availableWidth = this.imageContainer.clientWidth || 300; // Fallback width
            const displaySize = Math.max(50, Math.min(this.requestedSize, availableWidth)); // Ensure a minimum size

            this.cropper.style.width = `${displaySize}px`;
            this.cropper.style.height = `${displaySize}px`; // Assuming square

            // Execute the callback function AFTER the DOM has been updated.
            if (callback) callback();
        });
    }

    setCropperShape(shape) {
        this.cropperShape = shape;
        this.squareBtn.classList.toggle('active', shape === 'square');
        this.circleBtn.classList.toggle('active', shape === 'circle');
        this.cropper.style.borderRadius = (shape === 'circle') ? '50%' : '0';
    }

    zoom(factor, zoomOrigin = null) {
        if (!this.imageLoaded) return;
        
        const newScale = this.currentScale * factor;
        const scale = Math.max(this.minScale, newScale); // Enforce min scale

        if (scale === this.currentScale) return;

        let origin;
        if (zoomOrigin) {
            // zoomOrigin is expected to be relative to the container
            origin = zoomOrigin; 
        } else {
            // Default origin is the center of the cropper
            origin = {
                // Calculate relative center using high-precision rects
                x: (this.cropper.getBoundingClientRect().left - this.imageContainer.getBoundingClientRect().left) + this.cropper.getBoundingClientRect().width / 2,
                y: (this.cropper.getBoundingClientRect().top - this.imageContainer.getBoundingClientRect().top) + this.cropper.getBoundingClientRect().height / 2
            };
        }

        // Calculate new image coordinates to zoom around the origin point
        const scaleRatio = scale / this.currentScale;
        this.imageX = origin.x - (origin.x - this.imageX) * scaleRatio;
        this.imageY = origin.y - (origin.y - this.imageY) * scaleRatio;

        this.currentScale = scale;
        this.enforceBounds();
        this.updateImageTransform();
    }
    
    handleWheelZoom(e) {
        if (!this.imageLoaded) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const zoomOrigin = this.getRelativeCoords(e);
        this.zoom(delta, zoomOrigin);
    }

    updateImageTransform() {
        this.originalImage.style.left = `${this.imageX}px`;
        this.originalImage.style.top = `${this.imageY}px`;
        this.originalImage.style.transform = `scale(${this.currentScale})`;
    }

    startDrag(e) {
        if (!this.imageLoaded) return;
        e.preventDefault();

        if (e.touches && e.touches.length === 2) {
            this.dragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.initialPinchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        } else {
            this.dragging = true;
            const touch = e.touches ? e.touches[0] : e;
            this.startX = touch.clientX;
            this.startY = touch.clientY;
            this.startImageX = this.imageX;
            this.startImageY = this.imageY;
            this.imageContainer.style.cursor = 'grabbing';

            // Add temporary listeners to the window to handle dragging anywhere on the page
            window.addEventListener('mousemove', this.drag.bind(this));
            window.addEventListener('touchmove', this.drag.bind(this), { passive: false });
            window.addEventListener('mouseup', this.endDrag.bind(this));
            window.addEventListener('touchend', this.endDrag.bind(this));
        }
    }

    drag(e) {
        if (!this.imageLoaded) return;
        e.preventDefault();

        if (e.touches && e.touches.length === 2) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentPinchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

            if (this.initialPinchDistance > 0) {
                const zoomFactor = currentPinchDistance / this.initialPinchDistance;
                const pinchCenterViewport = {
                    clientX: (touch1.clientX + touch2.clientX) / 2,
                    clientY: (touch1.clientY + touch2.clientY) / 2
                };
                // Convert viewport pinch center to container-relative coordinates
                const pinchCenterRelative = this.getRelativeCoords(pinchCenterViewport);
                this.zoom(zoomFactor, pinchCenterRelative);
                this.initialPinchDistance = currentPinchDistance; // Update for next frame
            }
        } else if (this.dragging) {
            // Drag move
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - this.startX;
            const dy = touch.clientY - this.startY;
            this.imageX = this.startImageX + dx;
            this.imageY = this.startImageY + dy;
            
            this.enforceBounds();
            this.updateImageTransform();
        }
    }
    
    endDrag() {
        // This function can be called even if not dragging, so check state.
        if (!this.dragging && this.initialPinchDistance === 0) return;

        this.dragging = false;
        this.initialPinchDistance = 0;
        this.imageContainer.style.cursor = 'grab';

        // IMPORTANT: Clean up the global listeners to prevent conflicts
        window.removeEventListener('mousemove', this.drag.bind(this));
        window.removeEventListener('touchmove', this.drag.bind(this));
        window.removeEventListener('mouseup', this.endDrag.bind(this));
        window.removeEventListener('touchend', this.endDrag.bind(this));
    }

    enforceBounds() {
        const imageWidth = this.sourceImage.width * this.currentScale;
        const imageHeight = this.sourceImage.height * this.currentScale;

        // Use offset properties for robust positioning relative to the container
        const containerRect = this.imageContainer.getBoundingClientRect();
        const cropperRect = this.cropper.getBoundingClientRect();
        const cropperWidth = cropperRect.width;
        const cropperHeight = cropperRect.height;
        const cropperX = cropperRect.left - containerRect.left;
        const cropperY = cropperRect.top - containerRect.top;

        // By using Math.min/max to define the boundaries, we avoid conditional logic that is
        // sensitive to floating-point rounding errors when image and cropper sizes are nearly identical.
        const boundX1 = cropperX;
        const boundX2 = cropperX + cropperWidth - imageWidth;
        const minX = Math.min(boundX1, boundX2);
        const maxX = Math.max(boundX1, boundX2);

        const boundY1 = cropperY;
        const boundY2 = cropperY + cropperHeight - imageHeight;
        const minY = Math.min(boundY1, boundY2);
        const maxY = Math.max(boundY1, boundY2);

        this.imageX = Math.max(minX, Math.min(maxX, this.imageX));
        this.imageY = Math.max(minY, Math.min(maxY, this.imageY));
    }

    cropImage() {
        const containerRect = this.imageContainer.getBoundingClientRect();
        const cropperRect = this.cropper.getBoundingClientRect();
        const cropperWidth = cropperRect.width;
        const cropperHeight = cropperRect.height;

        // The actual output size the user wants
        const outputWidth = this.requestedSize;
        const outputHeight = this.requestedSize;

        this.previewCanvas.width = outputWidth;
        this.previewCanvas.height = outputHeight;
        const ctx = this.previewCanvas.getContext('2d');

        // Calculate the source rectangle from the original, full-resolution image
        // This new approach directly compares the final rendered positions of the image and the cropper,
        // This logic relies on the application's internal state (imageX, imageY), which has been
        // carefully constrained. This avoids measurement errors from getBoundingClientRect() on
        // transformed elements, which was the final source of discrepancies.
        const cropperX = cropperRect.left - containerRect.left;
        const cropperY = cropperRect.top - containerRect.top;
        const sx = (cropperX - this.imageX) / this.currentScale;
        const sy = (cropperY - this.imageY) / this.currentScale;
        const sWidth = cropperWidth / this.currentScale;
        const sHeight = cropperHeight / this.currentScale;

        ctx.clearRect(0, 0, outputWidth, outputHeight);

        if (this.cropperShape === 'circle') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(outputWidth / 2, outputHeight / 2, outputWidth / 2, 0, Math.PI * 2, true);
            ctx.clip();
        }

        ctx.drawImage(this.sourceImage, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);

        if (this.cropperShape === 'circle') {
            ctx.restore();
        }

        this.outputContainer.classList.remove('hidden');
    }

    downloadCroppedImage() {
        const link = document.createElement('a');
        const originalFileName = this.fileNameSpan.textContent.split('.').slice(0, -1).join('.') || 'cropped-image';
        link.download = `${originalFileName}-cropped.png`;
        link.href = this.previewCanvas.toDataURL('image/png');
        link.click();
    }
}

// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    new ImageCropperApp();
});