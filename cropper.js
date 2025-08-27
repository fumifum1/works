document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selection ---
    const imageUpload = document.getElementById('image-upload');
    const fileNameSpan = document.getElementById('file-name');
    const sizeInput = document.getElementById('size-input');
    const squareBtn = document.getElementById('square-btn');
    const circleBtn = document.getElementById('circle-btn');
    const cropButton = document.getElementById('cropButton');
    const imageContainer = document.getElementById('image-container');
    const originalImage = document.getElementById('original-image');
    const cropper = document.getElementById('cropper');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const outputContainer = document.getElementById('output-container');
    const previewCanvas = document.getElementById('preview-canvas');
    const downloadBtn = document.getElementById('download-btn');

    // --- State Variables ---
    let imageLoaded = false;
    let dragging = false;
    let currentScale = 1.0;
    let minScale = 1.0;
    let imageX = 0;
    let imageY = 0;
    let startX, startY, startImageX, startImageY;
    let sourceImage; // To hold the original Image object for canvas drawing
    let initialPinchDistance = 0;
    let cropperShape = 'square';

    // --- Event Listeners ---

    // File Upload
    imageUpload.addEventListener('change', handleImageUpload);

    // Cropper Size Control
    sizeInput.addEventListener('change', updateCropperSize);

    // Shape Control
    squareBtn.addEventListener('click', () => setCropperShape('square'));
    circleBtn.addEventListener('click', () => setCropperShape('circle'));

    // Zoom Controls
    zoomInBtn.addEventListener('click', () => zoom(1.1));
    zoomOutBtn.addEventListener('click', () => zoom(0.9));
    imageContainer.addEventListener('wheel', handleWheelZoom, { passive: false });

    // Drag and Touch Controls
    imageContainer.addEventListener('mousedown', startDrag);
    imageContainer.addEventListener('touchstart', startDrag, { passive: false });

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('mouseleave', endDrag); // To handle mouse leaving the window

    // Action Buttons
    cropButton.addEventListener('click', cropImage);
    downloadBtn.addEventListener('click', downloadCroppedImage);

    // --- Functions ---

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                sourceImage = new Image();
                sourceImage.onload = () => {
                    originalImage.src = event.target.result;
                    imageContainer.classList.remove('hidden');
                    outputContainer.classList.add('hidden');
                    // Defer initialization to the next animation frame
                    // to ensure the browser has calculated the layout after the image has loaded.
                    requestAnimationFrame(() => {
                        resetImageState();
                        initializeCropper();
                        imageLoaded = true;
                    });
                };
                sourceImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
            fileNameSpan.textContent = file.name;
        }
    }

    function resetImageState() {
        currentScale = 1.0;
        imageX = 0;
        imageY = 0;
    }

    function initializeCropper() {
        updateCropperSize(); // Set initial size from input

        const containerRect = imageContainer.getBoundingClientRect();
        const cropperRect = cropper.getBoundingClientRect();

        // Calculate minimum scale to fit the image within the cropper
        const scaleX = cropperRect.width / sourceImage.width;
        const scaleY = cropperRect.height / sourceImage.height;
        // The minimum scale allowed is when the image fits entirely inside the cropper.
        minScale = Math.min(scaleX, scaleY);
        // The initial scale should make the image cover the cropper for better UX.
        const initialScale = Math.max(scaleX, scaleY);
        currentScale = initialScale;

        // Calculate cropper's position relative to the container
        const cropperRelX = cropperRect.left - containerRect.left;
        const cropperRelY = cropperRect.top - containerRect.top;

        // Center the image inside the cropper area initially
        imageX = cropperRelX + (cropperRect.width - sourceImage.width * currentScale) / 2;
        imageY = cropperRelY + (cropperRect.height - sourceImage.height * currentScale) / 2;

        updateImageTransform();
        // Enforce bounds after initial positioning
        enforceBounds();
    }

    function updateCropperSize() {
        const size = parseInt(sizeInput.value, 10);
        if (isNaN(size) || size <= 0) return;

        cropper.style.width = `${size}px`;
        cropper.style.height = `${size}px`;

        if (imageLoaded) {
            // Re-initialize if an image is already loaded
            initializeCropper();
        }
    }

    function setCropperShape(shape) {
        cropperShape = shape;
        squareBtn.classList.toggle('active', shape === 'square');
        circleBtn.classList.toggle('active', shape === 'circle');
        cropper.style.borderRadius = (shape === 'circle') ? '50%' : '0';
    }

    function zoom(factor, zoomOrigin = null) {
        if (!imageLoaded) return;
        
        const newScale = currentScale * factor;
        const scale = Math.max(minScale, newScale);

        if (scale === currentScale) return;

        let origin;
        if (zoomOrigin) {
            origin = zoomOrigin;
        } else {
            const cropperRect = cropper.getBoundingClientRect();
            origin = {
                x: cropperRect.left + cropperRect.width / 2,
                y: cropperRect.top + cropperRect.height / 2
            };
        }

        const imageRect = originalImage.getBoundingClientRect();
        
        imageX -= (origin.x - imageRect.left) * (scale / currentScale - 1);
        imageY -= (origin.y - imageRect.top) * (scale / currentScale - 1);

        currentScale = scale;
        updateImageTransform();
        enforceBounds();
    }
    
    function handleWheelZoom(e) {
        if (!imageLoaded) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const zoomOrigin = { x: e.clientX, y: e.clientY };
        zoom(delta, zoomOrigin);
    }

    function updateImageTransform() {
        originalImage.style.transform = `translate(${imageX}px, ${imageY}px) scale(${currentScale})`;
    }

    function startDrag(e) {
        if (!imageLoaded) return;
        e.preventDefault();

        if (e.touches && e.touches.length === 2) {
            dragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialPinchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        } else {
            dragging = true;
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            startImageX = imageX;
            startImageY = imageY;
            imageContainer.style.cursor = 'grabbing';
        }
    }

    function drag(e) {
        if (!imageLoaded) return;
        e.preventDefault();

        if (e.touches && e.touches.length === 2) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentPinchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

            if (initialPinchDistance > 0) {
                const zoomFactor = currentPinchDistance / initialPinchDistance;
                const pinchCenter = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2
                };
                zoom(zoomFactor, pinchCenter);
                initialPinchDistance = currentPinchDistance; // Update for next frame
            }
        } else if (dragging) {
            // Drag move
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            imageX = startImageX + dx;
            imageY = startImageY + dy;
            
            enforceBounds();
            updateImageTransform();
        }
    }
    
    function endDrag() {
        if (dragging) {
            dragging = false;
            imageContainer.style.cursor = 'grab';
        }
        initialPinchDistance = 0;
    }

    function enforceBounds() {
        const imageWidth = sourceImage.width * currentScale;
        const imageHeight = sourceImage.height * currentScale;

        const containerRect = imageContainer.getBoundingClientRect();
        const cropperRect = cropper.getBoundingClientRect();

        const cropperRelX = cropperRect.left - containerRect.left;
        const cropperRelY = cropperRect.top - containerRect.top;

        let minX, maxX, minY, maxY;

        // If image is wider than cropper, it can be moved left/right
        if (imageWidth >= cropperRect.width) {
            maxX = cropperRelX;
            minX = cropperRelX + cropperRect.width - imageWidth;
        } else {
            // If image is narrower, it can be moved left/right within the cropper
            minX = cropperRelX;
            maxX = cropperRelX + cropperRect.width - imageWidth;
        }

        // If image is taller than cropper, it can be moved up/down
        if (imageHeight >= cropperRect.height) {
            maxY = cropperRelY;
            minY = cropperRelY + cropperRect.height - imageHeight;
        } else {
            // If image is shorter, it can be moved up/down within the cropper
            minY = cropperRelY;
            maxY = cropperRelY + cropperRect.height - imageHeight;
        }

        imageX = Math.max(minX, Math.min(maxX, imageX));
        imageY = Math.max(minY, Math.min(maxY, imageY));
    }

    function cropImage() {
        if (!imageLoaded) {
            alert('先に画像をアップロードしてください。');
            return;
        }

        const containerRect = imageContainer.getBoundingClientRect();
        const cropperRect = cropper.getBoundingClientRect();
        const cropperWidth = cropperRect.width;
        const cropperHeight = cropperRect.height;

        previewCanvas.width = cropperWidth;
        previewCanvas.height = cropperHeight;
        const ctx = previewCanvas.getContext('2d');

        const cropperRelX = cropperRect.left - containerRect.left;
        const cropperRelY = cropperRect.top - containerRect.top;

        const sx = (cropperRelX - imageX) / currentScale;
        const sy = (cropperRelY - imageY) / currentScale;
        const sWidth = cropperWidth / currentScale;
        const sHeight = cropperHeight / currentScale;

        ctx.clearRect(0, 0, cropperWidth, cropperHeight);

        if (cropperShape === 'circle') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cropperWidth / 2, cropperHeight / 2, cropperWidth / 2, 0, Math.PI * 2, true);
            ctx.clip();
        }

        ctx.drawImage(sourceImage, sx, sy, sWidth, sHeight, 0, 0, cropperWidth, cropperHeight);

        if (cropperShape === 'circle') {
            ctx.restore();
        }

        outputContainer.classList.remove('hidden');
    }

    function downloadCroppedImage() {
        const link = document.createElement('a');
        const originalFileName = fileNameSpan.textContent.split('.').slice(0, -1).join('.') || 'cropped-image';
        link.download = `${originalFileName}-cropped.png`;
        link.href = previewCanvas.toDataURL('image/png');
        link.click();
    }

    // Initialize on load
    updateCropperSize();
    setCropperShape('square');
});