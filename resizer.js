document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const imageInput = document.getElementById('imageInput');
    const resizeSection = document.getElementById('resizeSection');
    const resizeSlider = document.getElementById('resizeSlider');
    const resizePercentage = document.getElementById('resizePercentage');
    const resizeButton = document.getElementById('resizeButton');
    const previewArea = document.getElementById('preview-area');
    const downloadLink = document.getElementById('downloadLink');
    const loader = document.getElementById('loader');
    const downloadActions = document.getElementById('download-actions');
    const downloadZipButton = document.getElementById('downloadZipButton');

    // Check if all required elements exist to prevent errors
    if (!imageInput || !resizeSection || !resizeSlider || !resizePercentage || !resizeButton || !previewArea || !downloadLink || !loader || !downloadActions || !downloadZipButton) {
        console.error('Resizer script: One or more required DOM elements are missing.');
        return; // Stop execution if elements are not found
    }

    let selectedFiles = [];

    // Store resized image data
    let resizedImages = [];

    // --- Resizer Logic ---
    imageInput.addEventListener('change', (e) => {
        selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            resizeSection.style.display = 'block';
            previewArea.innerHTML = `<p>${selectedFiles.length}個のファイルが選択されました。サイズを指定してボタンを押してください。</p>`;
            downloadActions.style.display = 'none'; // Hide download buttons on new selection
            downloadZipButton.disabled = true; // Ensure zip button is disabled
        } else {
            resizeSection.style.display = 'none';
        }
    });

    // Sync slider and number input
    resizeSlider.addEventListener('input', () => {
        resizePercentage.value = resizeSlider.value;
    });

    resizePercentage.addEventListener('input', () => {
        let value = parseInt(resizePercentage.value, 10);
        if (isNaN(value)) return;
        value = Math.max(1, Math.min(200, value)); // Clamp value
        resizeSlider.value = value;
    });
    
    // Function to resize a single image file and return a Blob with dimensions
    function resizeImage(file, scale) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const originalWidth = img.width;
                    const originalHeight = img.height;
                    const newWidth = Math.round(originalWidth * scale);
                    const newHeight = Math.round(originalHeight * scale);

                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = newWidth;
                    tempCanvas.height = newHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(img, 0, 0, newWidth, newHeight);

                    tempCanvas.toBlob((blob) => {
                        if (blob) {
                            resolve({
                                blob,
                                fileName: file.name,
                                originalWidth,
                                originalHeight,
                                newWidth,
                                newHeight
                            });
                        } else {
                            reject(new Error(`Failed to create blob for ${file.name}`));
                        }
                    }, 'image/png'); // Output as PNG
                };
                img.onerror = () => reject(new Error(`Failed to load image ${file.name}`));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    // Function to create a preview list item
    function createPreviewListItem(data, parentList) {
        const listItem = document.createElement('li');
        listItem.className = 'preview-list-item';
        
        const infoContainer = document.createElement('div');
        infoContainer.className = 'file-info-container';

        const fileNameSpan = document.createElement('span');
        fileNameSpan.className = 'file-name';
        fileNameSpan.textContent = data.fileName;

        const sizeInfoSpan = document.createElement('span');
        sizeInfoSpan.className = 'size-info';
        sizeInfoSpan.textContent = `(${data.originalWidth}x${data.originalHeight}) → (${data.newWidth}x${data.newHeight})`;
        
        infoContainer.appendChild(fileNameSpan);
        infoContainer.appendChild(sizeInfoSpan);

        const individualDownloadLink = document.createElement('a');
        individualDownloadLink.href = URL.createObjectURL(data.blob);
        individualDownloadLink.download = data.fileName;
        individualDownloadLink.className = 'download-individual-link';
        individualDownloadLink.textContent = '個別ダウンロード';

        listItem.appendChild(infoContainer);
        listItem.appendChild(individualDownloadLink);
        parentList.appendChild(listItem);
    }

    resizeButton.addEventListener('click', async () => {
        if (selectedFiles.length === 0) {
            alert('画像が選択されていません。');
            return;
        }
        const scale = parseInt(resizePercentage.value, 10) / 100;
        if (isNaN(scale) || scale <= 0) {
            alert('有効なリサイズ率を指定してください。');
            return;
        }

        resizeButton.disabled = true;
        loader.style.display = 'block';
        previewArea.innerHTML = ''; // Clear previous previews
        downloadActions.style.display = 'none';
        downloadZipButton.disabled = true; // Keep disabled during processing
        resizedImages = []; // Clear previous results

        // Create a list container
        const list = document.createElement('ul');
        list.className = 'preview-list';
        previewArea.appendChild(list);

        const resizePromises = selectedFiles.map(file => resizeImage(file, scale));

        try {
            const results = await Promise.all(resizePromises);
            resizedImages = results; // Store results

            if (resizedImages.length > 0) {
                resizedImages.forEach(result => createPreviewListItem(result, list));
                downloadActions.style.display = 'block'; // Show download buttons
                downloadZipButton.disabled = false; // Enable the zip button
            } else {
                previewArea.innerHTML = '<p>リサイズ処理が可能な画像がありませんでした。</p>';
            }

        } catch (error) {
            console.error(error);
            alert('画像のリサイズ中にエラーが発生しました。\n' + error.message);
        } finally {
            resizeButton.disabled = false;
            loader.style.display = 'none';
        }
    });

    downloadZipButton.addEventListener('click', async () => {
        if (resizedImages.length === 0) return;

        const zip = new JSZip();
        resizedImages.forEach(image => zip.file(image.fileName, image.blob));

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = 'resized_images.zip';
        downloadLink.click();
    });
});
