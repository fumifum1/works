    document.addEventListener('DOMContentLoaded', () => {
        const imageUpload = document.getElementById('image-upload');
        const fileNameDisplay = document.getElementById('file-name');
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        const cropBtn = document.getElementById('crop-btn');
        const downloadBtn = document.getElementById('download-btn');
        const squareBtn = document.getElementById('square-btn');
        const circleBtn = document.getElementById('circle-btn');
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        
        const imageContainer = document.getElementById('image-container');
        const originalImage = document.getElementById('original-image');
        const cropper = document.getElementById('cropper');
        const previewCanvas = document.getElementById('preview-canvas');
        const outputContainer = document.getElementById('output-container');
        const zoomControls = document.querySelector('.zoom-controls');
        
        const hamburger = document.querySelector('.hamburger-menu');
        const navMenu = document.querySelector('.nav-menu');
        const overlay = document.querySelector('.overlay');

        let currentImage = null;
        let isDragging = false;
        let startX, startY;
        let cropperX = 0, cropperY = 0;
        let cropShape = 'square';
        let zoomLevel = 1.0;
        const zoomStep = 0.1;
        const maxZoom = 2.0;
        const minZoom = 0.2;
        
        // Helper function to show a message box
        function showMessage(text) {
            const messageBox = document.getElementById('message-box');
            const messageText = document.getElementById('message-text');
            messageBox.style.display = 'block';
            messageText.textContent = text;
        }
        
        // Helper function to get coordinates safely from mouse or touch events
        function getEventClientCoords(e) {
            if (e.touches && e.touches.length > 0) {
                return {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            } else {
                return {
                    x: e.clientX,
                    y: e.clientY
                };
            }
        }

        // Handle image upload
        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                // Clear file name display if no file is selected
                fileNameDisplay.textContent = '';
                return;
            }

            // Display the file name
            fileNameDisplay.textContent = file.name;

            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage.onload = () => {
                    currentImage = originalImage;
                    imageContainer.classList.remove('hidden');
                    zoomControls.classList.remove('hidden');
                    cropper.style.display = 'block';
                    // Reset zoom level on new image upload
                    zoomLevel = 1.0;
                    originalImage.style.transform = `scale(${zoomLevel})`;
                    updateCropperSizeAndPosition();
                    outputContainer.classList.add('hidden');
                };
                originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });

        // Handle input changes
        widthInput.addEventListener('input', updateCropperSizeAndPosition);
        heightInput.addEventListener('input', updateCropperSizeAndPosition);
        
        // Handle shape selection
        squareBtn.addEventListener('click', () => {
            cropShape = 'square';
            squareBtn.classList.add('active');
            circleBtn.classList.remove('active');
            cropper.classList.remove('circle');
            updateCropperSizeAndPosition();
        });

        circleBtn.addEventListener('click', () => {
            cropShape = 'circle';
            circleBtn.classList.add('active');
            squareBtn.classList.remove('active');
            cropper.classList.add('circle');
            updateCropperSizeAndPosition();
        });

        // Update cropper size and position based on inputs and zoom
        function updateCropperSizeAndPosition() {
            if (!currentImage) return;
            
            const cropperWidth = parseInt(widthInput.value, 10);
            const cropperHeight = parseInt(heightInput.value, 10);

            if (isNaN(cropperWidth) || cropperWidth <= 0) return;
            if (isNaN(cropperHeight) || cropperHeight <= 0) return;

            const imgDisplayWidth = originalImage.clientWidth;
            const imgDisplayHeight = originalImage.clientHeight;
            const containerWidth = imageContainer.clientWidth;
            const containerHeight = imageContainer.clientHeight;
            
            // Calculate the scaling ratio of the image based on its container, without zoom
            const imageScaleFactor = Math.min(containerWidth / originalImage.naturalWidth, containerHeight / originalImage.naturalHeight);

            // Calculate cropper display size based on the natural size and the image container scale
            let cropperDisplayWidth = cropperWidth * imageScaleFactor;
            let cropperDisplayHeight = cropperHeight * imageScaleFactor;

            if (cropShape === 'circle') {
                const size = Math.min(cropperDisplayWidth, cropperDisplayHeight);
                cropperDisplayWidth = size;
                cropperDisplayHeight = size;
            }

            cropper.style.width = `${cropperDisplayWidth}px`;
            cropper.style.height = `${cropperDisplayHeight}px`;

            // Adjust cropper position to stay within the image boundaries
            const maxCropperX = imgDisplayWidth - cropperDisplayWidth;
            const maxCropperY = imgDisplayHeight - cropperDisplayHeight;

            // Center the cropper initially
            cropperX = (imgDisplayWidth - cropperDisplayWidth) / 2;
            cropperY = (imgDisplayHeight - cropperDisplayHeight) / 2;
            
            cropper.style.left = `${cropperX}px`;
            cropper.style.top = `${cropperY}px`;
        }

        // Handle cropper dragging
        function startDrag(e) {
            if (!currentImage) return;
            isDragging = true;
            const coords = getEventClientCoords(e);
            startX = coords.x - cropper.offsetLeft;
            startY = coords.y - cropper.offsetTop;
            cropper.style.cursor = 'grabbing';
            e.preventDefault();
        }

        function doDrag(e) {
            if (!isDragging) return;
            
            const coords = getEventClientCoords(e);
            let newX = coords.x - startX;
            let newY = coords.y - startY;

            const imageDisplayWidth = originalImage.clientWidth;
            const imageDisplayHeight = originalImage.clientHeight;
            
            const cropperWidth = cropper.offsetWidth;
            const cropperHeight = cropper.offsetHeight;

            // Calculate the visible image area within the container, accounting for its position
            const imageX = (imageContainer.clientWidth - imageDisplayWidth) / 2;
            const imageY = (imageContainer.clientHeight - imageDisplayHeight) / 2;
            
            const minX = imageX;
            const minY = imageY;
            const maxX = imageX + imageDisplayWidth - cropperWidth;
            const maxY = imageY + imageDisplayHeight - cropperHeight;
            
            // Clamp the new position to stay within the visible image bounds
            cropperX = Math.max(minX, Math.min(newX, maxX));
            cropperY = Math.max(minY, Math.min(newY, maxY));
            
            cropper.style.left = `${cropperX}px`;
            cropper.style.top = `${cropperY}px`;
        }

        function endDrag() {
            isDragging = false;
            cropper.style.cursor = 'grab';
        }
        
        cropper.addEventListener('mousedown', startDrag);
        cropper.addEventListener('touchstart', startDrag);

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('touchmove', doDrag);

        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        
        // Handle zoom
        zoomInBtn.addEventListener('click', () => {
            if (!currentImage) return;
            zoomLevel = Math.min(zoomLevel + zoomStep, maxZoom);
            originalImage.style.transform = `scale(${zoomLevel})`;
            updateCropperPositionAfterZoom();
        });

        zoomOutBtn.addEventListener('click', () => {
            if (!currentImage) return;
            zoomLevel = Math.max(zoomLevel - zoomStep, minZoom);
            originalImage.style.transform = `scale(${zoomLevel})`;
            updateCropperPositionAfterZoom();
        });

        // Update cropper position after zooming to keep it within bounds
        function updateCropperPositionAfterZoom() {
            const cropperWidth = cropper.offsetWidth;
            const cropperHeight = cropper.offsetHeight;
            const imageDisplayWidth = originalImage.clientWidth;
            const imageDisplayHeight = originalImage.clientHeight;
            
            const imageX = (imageContainer.clientWidth - imageDisplayWidth) / 2;
            const imageY = (imageContainer.clientHeight - imageDisplayHeight) / 2;
            
            // Clamp the cropper's position to stay within the new image boundaries
            let newX = Math.max(imageX, Math.min(cropperX, imageX + imageDisplayWidth - cropperWidth));
            let newY = Math.max(imageY, Math.min(cropperY, imageY + imageDisplayHeight - cropperHeight));
            
            cropperX = newX;
            cropperY = newY;
            
            cropper.style.left = `${cropperX}px`;
            cropper.style.top = `${cropperY}px`;
        }

        // Handle cropping button click
        cropBtn.addEventListener('click', () => {
            if (!currentImage) {
                showMessage('画像をアップロードしてください。');
                return;
            }
            
            const cropWidth = parseInt(widthInput.value, 10);
            const cropHeight = parseInt(heightInput.value, 10);
            
            if (isNaN(cropWidth) || isNaN(cropHeight) || cropWidth <= 0 || cropHeight <= 0) {
                showMessage('有効なピクセルサイズを入力してください。');
                return;
            }

            const imgWidth = originalImage.naturalWidth;
            const imgHeight = originalImage.naturalHeight;
            const displayWidth = originalImage.clientWidth;
            const displayHeight = originalImage.clientHeight;
            
            const displayScale = Math.min(imageContainer.clientWidth / imgWidth, imageContainer.clientHeight / imgHeight);

            // Calculate the source coordinates and dimensions on the original image, taking zoom into account
            // First, get the cropper's position relative to the scaled image
            const imageRect = originalImage.getBoundingClientRect();
            const cropperRect = cropper.getBoundingClientRect();
            
            const scaledSourceX = cropperRect.left - imageRect.left;
            const scaledSourceY = cropperRect.top - imageRect.top;
            
            // Now, scale these coordinates and dimensions back to the original image's resolution
            const sourceX = (scaledSourceX / displayWidth) * imgWidth / zoomLevel;
            const sourceY = (scaledSourceY / displayHeight) * imgHeight / zoomLevel;
            const sourceWidth = (cropper.clientWidth / displayWidth) * imgWidth / zoomLevel;
            const sourceHeight = (cropper.clientHeight / displayHeight) * imgHeight / zoomLevel;


            // Draw to Canvas
            previewCanvas.width = cropWidth;
            previewCanvas.height = cropHeight;
            const ctx = previewCanvas.getContext('2d');
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

            // Apply circle clipping if selected
            if (cropShape === 'circle') {
                ctx.beginPath();
                const radius = Math.min(cropWidth, cropHeight) / 2;
                ctx.arc(cropWidth / 2, cropHeight / 2, radius, 0, 2 * Math.PI);
                ctx.clip();
            }

            ctx.drawImage(
                currentImage, 
                sourceX, 
                sourceY, 
                sourceWidth, 
                sourceHeight, 
                0, 
                0, 
                cropWidth, 
                cropHeight
            );
            
            outputContainer.classList.remove('hidden');
        });

        // Handle download button click
        downloadBtn.addEventListener('click', () => {
            if (!currentImage) {
                showMessage('最初に画像をトリミングしてください。');
                return;
            }
            
            const mimeType = 'image/png';
            const dataURL = previewCanvas.toDataURL(mimeType);
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `cropped-image-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
        
        // Initial setup
        if (!originalImage.src) {
            imageContainer.classList.add('hidden');
            outputContainer.classList.add('hidden');
        }
        
        // Update cropper position on window resize
        window.addEventListener('resize', updateCropperSizeAndPosition);
    });
            // Function to toggle menu
        const toggleMenu = () => {
            hamburger.classList.toggle('open');
            navMenu.classList.toggle('open');
            overlay.classList.toggle('open');
        };