document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const imageUpload = document.getElementById('image-upload');
    const canvasContainer = document.querySelector('.canvas-container');
    const imageCanvas = document.getElementById('image-canvas');
    const ctx = imageCanvas.getContext('2d');
    const cropArea = document.getElementById('crop-area');
    const resizeHandle = document.getElementById('resize-handle');
    const cropButton = document.getElementById('crop-button');
    const shapeRadios = document.querySelectorAll('input[name="shape"]');
    const previewImageContainer = document.getElementById('preview-image-container');
    const downloadSizeInput = document.getElementById('download-size');
    const downloadButton = document.getElementById('download-button');

    // View and Navigation Elements
    const views = document.querySelectorAll('.view');
    const backToUploadBtn = document.getElementById('back-to-upload-btn');
    const backToCropBtn = document.getElementById('back-to-crop-btn');

    // --- State Variables ---
    let originalImage = new Image();
    let isDragging = false;
    let isResizing = false;
    let croppedImageCanvas = null; // To store the high-res cropped canvas
    let startX, startY, startLeft, startTop, startWidth;
    let currentShape = 'square';

    // --- Functions ---

    /**
     * Shows a specific view and hides all others.
     * @param {string} viewId The ID of the view to show.
     */
    function showView(viewId) {
        views.forEach(view => {
            view.classList.toggle('active', view.id === viewId);
        });
    }

    /**
     * Resets the application to the initial upload screen.
     */
    function resetApp() {
        previewImageContainer.innerHTML = '';
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        croppedImageCanvas = null;
        imageUpload.value = ''; // Reset file input
        showView('view-upload');
    }

    /**
     * Handles the image file upload.
     */
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            originalImage.onload = () => {
                setupCanvasAndCropper();
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Sets up the canvas and cropper once the image is loaded.
     */
    function setupCanvasAndCropper() {
        // Switch to the crop view
        showView('view-crop');

        // Adjust canvas size to image aspect ratio, fitting within the container
        const containerWidth = canvasContainer.clientWidth;
        const scale = containerWidth / originalImage.naturalWidth;
        imageCanvas.width = containerWidth;
        imageCanvas.height = originalImage.naturalHeight * scale;

        const size = Math.min(imageCanvas.width, imageCanvas.height) * 0.5;
        cropArea.style.width = `${size}px`;
        cropArea.style.height = `${size}px`;
        cropArea.style.left = `${(imageCanvas.width - size) / 2}px`;
        cropArea.style.top = `${(imageCanvas.height - size) / 2}px`;

        ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);
    }

    /**
     * Constrains a value between a min and max.
     */
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // --- Event Handlers for Dragging ---
    function onDragStart(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        startLeft = cropArea.offsetLeft;
        startTop = cropArea.offsetTop;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchend', onDragEnd);
    }

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // Constrain within canvas bounds
        newLeft = clamp(newLeft, 0, imageCanvas.width - cropArea.offsetWidth);
        newTop = clamp(newTop, 0, imageCanvas.height - cropArea.offsetHeight);

        cropArea.style.left = `${newLeft}px`;
        cropArea.style.top = `${newTop}px`;
    }

    function onDragEnd() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
        document.addEventListener('touchend', onDragEnd);
    }

    // --- Event Handlers for Resizing ---
    function onResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startWidth = cropArea.offsetWidth;
        startLeft = cropArea.offsetLeft;
        startTop = cropArea.offsetTop;
        document.addEventListener('mousemove', onResize);
        document.addEventListener('touchmove', onResize, { passive: false });
        document.addEventListener('mouseup', onResizeEnd);
        document.addEventListener('touchend', onResizeEnd);
    }

    function onResize(e) {
        if (!isResizing) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        
        let newSize = startWidth + dx;

        const maxSize = Math.min(imageCanvas.width - startLeft, imageCanvas.height - startTop);
        newSize = clamp(newSize, 50, maxSize); // Min size 50px

        cropArea.style.width = `${newSize}px`;
        cropArea.style.height = `${newSize}px`;
    }

    function onResizeEnd() {
        isResizing = false;
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('touchmove', onResize);
        document.removeEventListener('mouseup', onResizeEnd);
        document.addEventListener('touchend', onResizeEnd);
    }

    /**
     * Handles shape selection change.
     */
    function handleShapeChange(e) {
        currentShape = e.target.value;
        cropArea.classList.toggle('circle', currentShape === 'circle');
    }

    /**
     * Performs the crop and displays the preview.
     */
    function performCrop() {
        if (!originalImage.src) {
            alert('画像をアップロードしてください。');
            return;
        }

        const canvasScale = originalImage.naturalWidth / imageCanvas.width;
        const cropX = cropArea.offsetLeft * canvasScale;
        const cropY = cropArea.offsetTop * canvasScale;
        const cropWidth = cropArea.offsetWidth * canvasScale;
        const cropHeight = cropArea.offsetHeight * canvasScale;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;

        if (currentShape === 'circle') {
            tempCtx.beginPath();
            tempCtx.arc(cropWidth / 2, cropHeight / 2, cropWidth / 2, 0, Math.PI * 2, true);
            tempCtx.closePath();
            tempCtx.clip();
        }

        tempCtx.drawImage(
            originalImage,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );

        const dataUrl = tempCanvas.toDataURL('image/png');
        croppedImageCanvas = tempCanvas;
        previewImageContainer.innerHTML = `<img src="${dataUrl}" alt="Cropped Preview">`;

        showView('view-preview');
    }

    /**
     * Handles the download button click.
     */
    function handleDownload(e) {
        e.preventDefault();

        if (!croppedImageCanvas) {
            alert('先に「プレビューへ進む」ボタンを押してください。');
            return;
        }

        const finalSize = parseInt(downloadSizeInput.value, 10);
        if (isNaN(finalSize) || finalSize <= 0) {
            alert('有効なダウンロードサイズをピクセル単位で入力してください。');
            return;
        }

        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        finalCanvas.width = finalSize;
        finalCanvas.height = finalSize;

        finalCtx.drawImage(croppedImageCanvas, 0, 0, finalSize, finalSize);

        const link = document.createElement('a');
        link.href = finalCanvas.toDataURL('image/png');
        link.download = `cropped_image_${finalSize}px.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Event Listeners ---
    imageUpload.addEventListener('change', handleImageUpload);
    cropArea.addEventListener('mousedown', onDragStart);
    cropArea.addEventListener('touchstart', onDragStart, { passive: false });
    resizeHandle.addEventListener('mousedown', onResizeStart);
    resizeHandle.addEventListener('touchstart', onResizeStart, { passive: false });
    cropButton.addEventListener('click', performCrop);
    downloadButton.addEventListener('click', handleDownload);
    shapeRadios.forEach(radio => radio.addEventListener('change', handleShapeChange));
    backToUploadBtn.addEventListener('click', resetApp);
    backToCropBtn.addEventListener('click', () => showView('view-crop'));

    // --- Initial Setup ---
    showView('view-upload'); // Start at the upload view
});
