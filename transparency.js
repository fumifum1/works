document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const imageInput = document.getElementById('imageInput');
    const colorPicker1 = document.getElementById('colorPicker1');
    const colorPicker2 = document.getElementById('colorPicker2');
    const processButton = document.getElementById('processButton');
    const downloadButton = document.getElementById('downloadButton');
    const canvas = document.getElementById('canvas');
    const loader = document.getElementById('loader');
    const toleranceSlider = document.getElementById('toleranceSlider');
    const toleranceValue = document.getElementById('toleranceValue');
    const resizeSlider = document.getElementById('resizeSlider');
    const resizePercentage = document.getElementById('resizePercentage');
    const toolPicker = document.getElementById('toolPicker');
    const toolProtect = document.getElementById('toolProtect');
    const toolEraser = document.getElementById('toolEraser');
    const brushSizeSlider = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');

    // 各セクションの要素を取得
    const uploadSection = document.getElementById('uploadSection');
    const processingSection = document.getElementById('processingSection');
    const downloadSection = document.getElementById('downloadSection');

    // --- Element Existence Check ---
    const requiredElements = [imageInput, colorPicker1, colorPicker2, processButton, downloadButton, canvas, loader, toleranceSlider, toleranceValue, resizeSlider, resizePercentage, uploadSection, processingSection, downloadSection];
    if (requiredElements.some(el => el === null)) {
        console.error('Transparency script: One or more required DOM elements are missing.');
        return; // Stop execution
    }

    const ctx = canvas.getContext('2d');

    // アプリケーションの状態を管理するオブジェクト
    const appState = {
        originalImage: null,
        processingCanvas: null, // 処理用の非表示Canvas
        processingCtx: null,    // 処理用の非表示コンテキスト
        maskCanvas: null,       // 保護エリア保存用
        maskCtx: null,
        currentTool: 'picker',  // 'picker', 'protect', 'eraser'
        isDrawing: false,
        brushSize: 20,
        displayMaskCanvas: null, // 表示用のマスクCanvas
        lastMousePos: null      // {x, y} for brush preview
    };

    // カラーピッカーのアクティブ状態を切り替える
    const colorPickerContainer1 = document.getElementById('colorPickerContainer1');
    const colorPickerContainer2 = document.getElementById('colorPickerContainer2');
    const pickerBoxes = [colorPickerContainer1, colorPickerContainer2];

    pickerBoxes.forEach(box => {
        box.addEventListener('click', () => {
            pickerBoxes.forEach(b => b.classList.remove('active-picker'));
            box.classList.add('active-picker');
        });
    });

    // 許容範囲スライダーの値が変更されたら表示を更新
    toleranceSlider.addEventListener('input', (e) => {
        toleranceValue.textContent = e.target.value;
    });

    // ツール切り替えの制御
    const tools = [toolPicker, toolProtect, toolEraser];
    tools.forEach(btn => {
        btn.addEventListener('click', () => {
            tools.forEach(b => b.classList.remove('active-picker', 'active'));
            btn.classList.add('active');
            appState.currentTool = btn.id === 'toolPicker' ? 'picker' : (btn.id === 'toolProtect' ? 'protect' : 'eraser');
            document.getElementById('brushControls').style.display = appState.currentTool === 'picker' ? 'none' : 'block';
            canvas.style.cursor = 'crosshair'; // Always show crosshair for clarity
            drawBrushPreview(); // ツール変更時にブラシプレビューを即座に更新
        });
    });

    brushSizeSlider.addEventListener('input', (e) => {
        appState.brushSize = parseInt(e.target.value, 10);
        brushSizeValue.textContent = appState.brushSize;
        drawBrushPreview(); // ブラシサイズ変更時にブラシプレビューを即座に更新
    });

    // マスク用のCanvasを初期化する関数
    function initMask() {
        if (!appState.originalImage) return;
        appState.maskCanvas = document.createElement('canvas');
        appState.maskCanvas.width = appState.originalImage.width;
        appState.maskCanvas.height = appState.originalImage.height;
        appState.maskCtx = appState.maskCanvas.getContext('2d');

        appState.maskCtx.clearRect(0, 0, appState.maskCanvas.width, appState.maskCanvas.height);

        if (!appState.displayMaskCanvas) {
            appState.displayMaskCanvas = document.createElement('canvas');
            appState.displayMaskCanvas.id = 'mask-canvas';
            document.getElementById('canvas-wrapper').appendChild(appState.displayMaskCanvas);
        }
        appState.displayMaskCanvas.width = canvas.width; // 表示用Canvasと同じサイズ
        appState.displayMaskCanvas.height = canvas.height; // 表示用Canvasと同じサイズ
        drawBrushPreview(); 
    }

    // ファイル選択時のイベントリスナー
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            appState.originalImage = new Image();
            appState.originalImage.onload = () => {
                // 1. 処理用Canvasを元のサイズで作成
                appState.processingCanvas = document.createElement('canvas');
                appState.processingCtx = appState.processingCanvas.getContext('2d');
                appState.processingCanvas.width = appState.originalImage.width;
                appState.processingCanvas.height = appState.originalImage.height;
                appState.processingCtx.drawImage(appState.originalImage, 0, 0);

                // 画像が読み込まれたら処理セクションを表示して、コンテナのサイズを計算できるようにする
                processingSection.style.display = 'block';
                downloadSection.style.display = 'none';

                // 2. 表示用Canvasをコンテナのサイズに合わせて設定
                const canvasWrapper = document.getElementById('canvas-wrapper');
                const availableWidth = canvasWrapper.clientWidth;

                const scale = Math.min(1, availableWidth / appState.originalImage.width);
                canvas.width = appState.originalImage.width * scale;
                canvas.height = appState.originalImage.height * scale;

                // 表示用Canvasに縮小して描画
                ctx.drawImage(appState.originalImage, 0, 0, canvas.width, canvas.height);
                initMask();
            };
            appState.originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // リサイズ用のスライダーと数値入力を同期させる
    resizeSlider.addEventListener('input', () => {
        resizePercentage.value = resizeSlider.value;
    });

    resizePercentage.addEventListener('input', () => {
        let value = parseInt(resizePercentage.value, 10);
        if (isNaN(value)) return;
        value = Math.max(1, Math.min(200, value)); // 念のため範囲内に収める
        resizeSlider.value = value;
    });

    // マウス移動時にブラシプレビューを更新
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        appState.lastMousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        drawBrushPreview();
    });
    canvas.addEventListener('mouseleave', () => {
        appState.lastMousePos = null;
        drawBrushPreview(); // マウスが離れたらブラシプレビューを消す
    });
    // Canvasでのマウス操作（描画と色取得）
    function handleCanvasInteraction(event) {
        if (!appState.processingCtx || !appState.maskCtx) return;

        // スポイトはクリックのみ、ブラシはドラッグ中のみ
        if (appState.currentTool !== 'picker' && !appState.isDrawing) return;
        if (appState.currentTool === 'picker' && event.type !== 'mousedown') return;

        const isManualProcess = appState.currentTool !== 'picker';

        // 表示Canvas上のクリック座標を取得
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // 表示Canvasと処理Canvasのスケールを計算
        const scaleX = appState.processingCanvas.width / canvas.width;
        const scaleY = appState.processingCanvas.height / canvas.height;

        // 処理Canvas上の対応する座標を計算
        const processingX = Math.floor(x * scaleX);
        const processingY = Math.floor(y * scaleY);

        if (appState.currentTool === 'picker') {
            // 処理Canvasからピクセルの色情報を取得
            const pixelData = appState.processingCtx.getImageData(processingX, processingY, 1, 1).data;
            const hexColor = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
            const activePickerInput = document.querySelector('.color-picker-box.active-picker input[type="color"]');
            if (activePickerInput) activePickerInput.value = hexColor;
        } else {
            // ブラシ描画（保護：白、消し：黒）
            appState.maskCtx.beginPath();
            const radius = (appState.brushSize / 2) * scaleX;
            appState.maskCtx.arc(processingX, processingY, radius, 0, Math.PI * 2);
            
            if (appState.currentTool === 'protect') {
                appState.maskCtx.globalCompositeOperation = 'source-over';
                appState.maskCtx.fillStyle = 'white';
            } else {
                // 消しゴムモード：描画済みの部分を透明にする
                appState.maskCtx.globalCompositeOperation = 'destination-out';
                appState.maskCtx.fillStyle = 'rgba(0,0,0,1)'; 
            }
            
            appState.maskCtx.fill();
            
            // 描画中もプレビューを更新
            appState.lastMousePos = { x, y };
            drawBrushPreview();
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        appState.isDrawing = true;
        handleCanvasInteraction(e);
    });
    window.addEventListener('mousemove', (e) => {
        if (appState.isDrawing) handleCanvasInteraction(e);
    });
    window.addEventListener('mouseup', () => {
        appState.isDrawing = false;
    });

    // マスク（青色）とブラシの残像を描画する統合関数
    function drawBrushPreview() {
        if (!appState.displayMaskCanvas) return;
        const mCtx = appState.displayMaskCanvas.getContext('2d');
        const { width, height } = canvas;

        mCtx.clearRect(0, 0, width, height);
        
        if (appState.maskCanvas) {
            // 1. マスクCanvas（白で塗った場所）を青色の半透明として描画
            mCtx.save();
            // 一時的に不透明な青としてマスクを重ねる
            mCtx.globalAlpha = 0.5; // 青色の濃さ
            mCtx.drawImage(appState.maskCanvas, 0, 0, width, height);
            
            // マスクの白い部分だけを青に染める
            mCtx.globalCompositeOperation = 'source-in';
            mCtx.fillStyle = '#007bff'; // Jimpの青
            mCtx.fillRect(0, 0, width, height);
            mCtx.restore();
        }

        // 2. マウス位置にブラシのガイド（白い円）を表示
        if (appState.lastMousePos && (appState.currentTool === 'protect' || appState.currentTool === 'eraser')) {
            const { x, y } = appState.lastMousePos;
            mCtx.beginPath();
            mCtx.arc(x, y, appState.brushSize / 2, 0, Math.PI * 2);
            mCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            mCtx.lineWidth = 2;
            mCtx.stroke();
            
            // 中心点（ポインタ）
            mCtx.beginPath();
            mCtx.arc(x, y, 1, 0, Math.PI * 2);
            mCtx.fillStyle = 'white';
            mCtx.fill();
        }

        mCtx.globalAlpha = 1.0;
    }

    // 指定された色を透明にする画像処理関数
    function processImageTransparency(imageData, colorToRemove1, colorToRemove2, tolerance, maskData) {
        const data = imageData.data;
        const mData = maskData.data;
        if (!colorToRemove1 || !colorToRemove2) {
            alert('無効な色が選択されています。');
            return null;
        }

        for (let i = 0; i < data.length; i += 4) {
            // マスクチェック：白（保護）の場合はスキップ
            // maskDataはグレースケールだが、R値で判定
            // maskDataのR値が128より大きい（白に近い）場合は保護されていると判断
            if (mData[i] > 128) { // 0-255の範囲で、白は255、黒は0
                continue;
            }

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const currentPixelColor = { r, g, b };
            
            // 色の距離を計算し、許容範囲内であれば透明にする
            if (colorDistance(currentPixelColor, colorToRemove1) <= tolerance || colorDistance(currentPixelColor, colorToRemove2) <= tolerance) {
                data[i + 3] = 0; // アルファ値を0にして透明にする
            }
        }
        return imageData;
    }

    // 背景削除ボタンのイベントリスナー
    processButton.addEventListener('click', () => {
        if (!appState.originalImage) {
            alert('最初に画像をアップロードしてください。');
            return;
        }
        
        processButton.disabled = true;
        downloadButton.disabled = true;
        loader.style.display = 'block';

        // UIの更新を確実にするため、重い処理を少し遅延させる
        setTimeout(() => {
            // 元の画像を処理用キャンバスに再描画して処理を開始
            appState.processingCtx.drawImage(appState.originalImage, 0, 0);
            let imageData = appState.processingCtx.getImageData(0, 0, appState.processingCanvas.width, appState.processingCanvas.height);
            let maskData = appState.maskCtx.getImageData(0, 0, appState.maskCanvas.width, appState.maskCanvas.height);
            
            const colorToRemove1 = hexToRgb(colorPicker1.value);
            const colorToRemove2 = hexToRgb(colorPicker2.value);
            const tolerance = parseInt(toleranceSlider.value, 10);

            const processedImageData = processImageTransparency(imageData, colorToRemove1, colorToRemove2, tolerance, maskData);

            if (processedImageData) {
                // 処理結果を処理用キャンバスに書き戻す
                appState.processingCtx.putImageData(processedImageData, 0, 0);
                // 表示用Canvasにも処理結果を縮小して反映
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(appState.processingCanvas, 0, 0, canvas.width, canvas.height);
            }

            // マスクをクリアして、次の操作に備える
            if (appState.maskCtx) {
                appState.maskCtx.globalCompositeOperation = 'source-over';
                appState.maskCtx.clearRect(0, 0, appState.maskCanvas.width, appState.maskCanvas.height);
            }
            drawBrushPreview(); // 表示上の青色も消す

            // リサイズコントロールを100%にリセット
            resizeSlider.value = 100;
            resizePercentage.value = 100;

            processButton.disabled = false;
            downloadButton.disabled = false;
            loader.style.display = 'none';
            downloadSection.style.display = 'block'; // 処理が完了したらダウンロードセクションを表示
        }, 50); // わずかな遅延
    });

    // ダウンロードボタンのイベントリスナー（リサイズ機能付き）
    downloadButton.addEventListener('click', () => {
        const scale = parseInt(resizePercentage.value, 10) / 100;

        if (isNaN(scale) || scale <= 0) {
            alert('スケールに有効な数値を入力してください。');
            return;
        }

        // スケールに基づいて目標の幅と高さを計算
        const targetWidth = Math.round(appState.processingCanvas.width * scale);
        const targetHeight = Math.round(appState.processingCanvas.height * scale);

        // リサイズ用の一次的なCanvasを作成
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;

        // 処理済み画像をリサイズして描画
        tempCtx.drawImage(appState.processingCanvas, 0, 0, targetWidth, targetHeight);

        const link = document.createElement('a');
        link.download = 'transparent_resized_image.png';
        // リサイズされたCanvasから画像データを取得
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 16進数のカラーコードをRGB値に変換するヘルパー関数
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // 2つのRGB色の距離を計算する関数 (ユークリッド距離)
    function colorDistance(rgb1, rgb2) {
        const rDiff = rgb1.r - rgb2.r;
        const gDiff = rgb1.g - rgb2.g;
        const bDiff = rgb1.b - rgb2.b;
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }

    // RGB値を16進数のカラーコードに変換するヘルパー関数
    function rgbToHex(r, g, b) {
        const toHex = c => ('0' + c.toString(16)).slice(-2);
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
});