document.addEventListener('DOMContentLoaded', () => {
    // --- Hamburger Menu Elements ---
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const globalNav = document.getElementById('globalNav');

    // --- Cropper Elements ---
    const imageUpload = document.getElementById('image-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
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

    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    const messageOkBtn = messageBox.querySelector('button');

    // 状態を管理する変数
    let imageLoaded = false;
    let currentScale = 1;
    let minScale = 1;
    let shape = 'square';
    let imageX = 0;
    let imageY = 0;
    let dragging = false;
    let startX, startY, startImageX, startImageY;
    let sourceImage; // Canvasに描画するための元のImageオブジェクト

    // --- イベントリスナーの設定 ---

    // Hamburger Menu Logic
    if (hamburgerMenu && globalNav) {
        hamburgerMenu.addEventListener('click', () => {
            hamburgerMenu.classList.toggle('active');
            globalNav.classList.toggle('active');
        });
    }

    // Cropper Logic
    imageUpload.addEventListener('change', handleImageUpload);
    squareBtn.addEventListener('click', () => setShape('square'));
    circleBtn.addEventListener('click', () => setShape('circle'));
    zoomInBtn.addEventListener('click', () => zoom(1.1));
    zoomOutBtn.addEventListener('click', () => zoom(0.9));
    
    // ドラッグとタッチ操作
    imageContainer.addEventListener('mousedown', startDrag, { passive: false });
    imageContainer.addEventListener('mousemove', drag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    imageContainer.addEventListener('touchstart', startDrag, { passive: false });
    imageContainer.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    imageContainer.addEventListener('wheel', handleWheelZoom, { passive: false });

    cropButton.addEventListener('click', cropImage);
    downloadBtn.addEventListener('click', downloadImage);
    messageOkBtn.addEventListener('click', () => {
        messageBox.style.display = 'none';
    });
    
    // --- 関数 ---

    function showMessage(msg) {
        messageText.textContent = msg;
        messageBox.style.display = 'flex';
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            showMessage('画像ファイルを選択してください。');
            return;
        }
        fileNameDisplay.textContent = file.name;

        const reader = new FileReader();
        reader.onload = (event) => {
            sourceImage = new Image();
            sourceImage.onload = () => {
                // 無効な画像ファイルが読み込まれた場合にエラーを防ぐ
                if (sourceImage.naturalWidth === 0 || sourceImage.naturalHeight === 0) {
                    showMessage('無効な画像ファイルです。別の画像を試してください。');
                    // ファイル選択をリセット
                    imageUpload.value = '';
                    fileNameDisplay.textContent = '';
                    return;
                }
                originalImage.src = event.target.result;
                imageContainer.classList.remove('hidden');
                outputContainer.classList.add('hidden');
                imageLoaded = true;
                resetImageState();
            };
            sourceImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function resetImageState() {
        // 画像がレンダリングされるのを待ってから寸法を取得
        setTimeout(() => {
            const containerWidth = imageContainer.clientWidth;
            const containerHeight = imageContainer.clientHeight;
            const cropperWidth = cropper.clientWidth;
            const cropperHeight = cropper.clientHeight;

            const imageAspectRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
            const cropperAspectRatio = cropperWidth / cropperHeight;

            let initialWidth, initialHeight;

            // 画像がトリミング枠を完全に覆うように初期サイズを計算 (CSSの background-size: cover と同じ考え方)
            if (imageAspectRatio > cropperAspectRatio) {
                // 画像が横長の場合、トリミング枠の高さに合わせる
                initialHeight = cropperHeight;
                initialWidth = initialHeight * imageAspectRatio;
            } else {
                // 画像が縦長の場合、トリミング枠の幅に合わせる
                initialWidth = cropperWidth;
                initialHeight = initialWidth / imageAspectRatio;
            }

            originalImage.style.width = `${initialWidth}px`;
            originalImage.style.height = `${initialHeight}px`;

            // この初期サイズを基準とするため、スケールは1から始める
            currentScale = 1;
            minScale = 1; // 初期サイズが最小サイズとなる

            // 画像をコンテナの中央に配置
            imageX = (containerWidth - initialWidth) / 2;
            imageY = (containerHeight - initialHeight) / 2;
            
            updateImageTransform();
            enforceBounds(); // 初期位置を確定
        }, 0);
    }

    function setShape(newShape) {
        shape = newShape;
        squareBtn.classList.toggle('active', shape === 'square');
        circleBtn.classList.toggle('active', shape === 'circle');
        cropper.style.borderRadius = (shape === 'circle') ? '50%' : '0';
    }

    function zoom(factor) {
        if (!imageLoaded) return;
        const newScale = currentScale * factor;
        // minScaleは常に1なので、それより小さくならないようにする
        currentScale = Math.max(minScale, newScale);
        updateImageTransform();
        enforceBounds(); // ズーム後に位置を再調整
    }
    
    function handleWheelZoom(e) {
        if (!imageLoaded) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        zoom(delta);
    }

    function updateImageTransform() {
        originalImage.style.transform = `translate(${imageX}px, ${imageY}px) scale(${currentScale})`;
    }

    function startDrag(e) {
        if (!imageLoaded) return;
        e.preventDefault();
        dragging = true;
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        startImageX = imageX;
        startImageY = imageY;
        imageContainer.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!dragging) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        imageX = startImageX + dx;
        imageY = startImageY + dy;
        
        enforceBounds();
        updateImageTransform();
    }
    
    function enforceBounds() {
        // getBoundingClientRect を使い、CSS transform を考慮した正確な位置とサイズを取得
        const containerRect = imageContainer.getBoundingClientRect();
        const cropperRect = cropper.getBoundingClientRect();
        const imageRect = originalImage.getBoundingClientRect();

        // コンテナを基準としたトリミング枠の相対位置
        const cropperRelX = cropperRect.left - containerRect.left;
        const cropperRelY = cropperRect.top - containerRect.top;

        // スケール適用後の画像の表示サイズ
        const imgVisualWidth = imageRect.width;
        const imgVisualHeight = imageRect.height;

        // 画像の左上の座標(imageX, imageY)が取りうる範囲を計算
        const maxX = cropperRelX;
        const minX = cropperRelX + cropperRect.width - imgVisualWidth;
        const maxY = cropperRelY;
        const minY = cropperRelY + cropperRect.height - imgVisualHeight;

        // 計算した範囲内に座標を制限する
        imageX = Math.max(minX, Math.min(imageX, maxX));
        imageY = Math.max(minY, Math.min(imageY, maxY));
    }

    function endDrag() {
        if (dragging) {
            dragging = false;
            imageContainer.style.cursor = 'grab';
        }
    }

    function cropImage() {
        if (!imageLoaded) {
            showMessage('最初に画像をアップロードしてください。');
            return;
        }

        const canvas = previewCanvas;
        const ctx = canvas.getContext('2d');

        const outputWidth = parseInt(widthInput.value, 10);
        const outputHeight = parseInt(heightInput.value, 10);

        if (isNaN(outputWidth) || isNaN(outputHeight) || outputWidth < 10 || outputHeight < 10) {
            showMessage('幅と高さに有効な数値を入力してください（10以上）。');
            return;
        }

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const imageRect = originalImage.getBoundingClientRect();
        const cropperRect = cropper.getBoundingClientRect();

        const cropXOnScaledImage = cropperRect.left - imageRect.left;
        const cropYOnScaledImage = cropperRect.top - imageRect.top;
        const cropWidthOnScaledImage = cropperRect.width;
        const cropHeightOnScaledImage = cropperRect.height;

        const scaleRatio = sourceImage.naturalWidth / imageRect.width;
        
        const sx = cropXOnScaledImage * scaleRatio;
        const sy = cropYOnScaledImage * scaleRatio;
        const sWidth = cropWidthOnScaledImage * scaleRatio;
        const sHeight = cropHeightOnScaledImage * scaleRatio;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            sourceImage,
            sx, sy, sWidth, sHeight,
            0, 0, canvas.width, canvas.height
        );

        if (shape === 'circle') {
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        outputContainer.classList.remove('hidden');
        outputContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function downloadImage() {
        const dataUrl = previewCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `cropped-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Initialize
    setShape('square');
    imageContainer.style.cursor = 'grab';
});
