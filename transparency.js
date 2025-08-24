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

    // Canvasクリックで色を取得するスポイト機能
    canvas.addEventListener('click', (event) => {
        if (!appState.processingCtx) return;

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

        // 処理Canvasからピクセルの色情報を取得
        const pixelData = appState.processingCtx.getImageData(processingX, processingY, 1, 1).data;

        const hexColor = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);

        // アクティブなカラーピッカーの値を更新
        const activePickerInput = document.querySelector('.color-picker-box.active-picker input[type="color"]');
        if (activePickerInput) {
            activePickerInput.value = hexColor;
        }
    });

    // 指定された色を透明にする画像処理関数
    function processImageTransparency(imageData, colorToRemove1, colorToRemove2, tolerance) {
        const data = imageData.data;
        if (!colorToRemove1 || !colorToRemove2) {
            alert('無効な色が選択されています。');
            return null;
        }

        for (let i = 0; i < data.length; i += 4) {
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
            
            const colorToRemove1 = hexToRgb(colorPicker1.value);
            const colorToRemove2 = hexToRgb(colorPicker2.value);
            const tolerance = parseInt(toleranceSlider.value, 10);

            const processedImageData = processImageTransparency(imageData, colorToRemove1, colorToRemove2, tolerance);

            if (processedImageData) {
                // 処理結果を処理用キャンバスに書き戻す
                appState.processingCtx.putImageData(processedImageData, 0, 0);
                // 表示用Canvasにも処理結果を縮小して反映
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(appState.processingCanvas, 0, 0, canvas.width, canvas.height);
            }

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