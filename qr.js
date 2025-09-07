const qrApp = {
    dom: {},
    state: {
        qrInstance: null,
        finalImage: null,
        logoData: null,
        isGenerating: false,
    },

    init() {
        this.cacheDOMElements();
        this.bindEvents();
        this.updateFillOptions(false);
        this.generate(); // Initial generation on load
    },

    debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },

    cacheDOMElements() {
        const ids = [
            'url-input', 'logo-upload', 'color-dark', 'color-light',
            'logo-circle-checkbox', 'logo-size-slider', 'logo-size-value', 'logo-position-select',
            'fg-gradient-start',
            'fg-gradient-end', 'bg-gradient-start', 'bg-gradient-end',
            'gradient-direction-select', 'dot-style-select', 'generate-button',
            'download-button', 'qr-container',
            'fill-type-solid', 'fill-type-gradient'
        ];
        ids.forEach(id => {
            const key = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            this.dom[key] = document.getElementById(id);
        });
        this.dom.tabButtons = document.querySelectorAll('.tab-button');
        this.dom.tabContents = document.querySelectorAll('.tab-content');
        this.dom.gradientPresets = document.querySelectorAll('.gradient-preset');
        this.dom.customGradientControls = document.querySelectorAll('.custom-gradient-controls');
        this.dom.solidColorOptions = document.querySelectorAll('[data-fill-option="solid"]');
        this.dom.gradientOptions = document.querySelectorAll('[data-fill-option="gradient"]');
    },

    bindEvents() {
        this.dom.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.handleTabSwitch(button));
        });

        const debouncedGenerate = this.debounce(() => this.generate(), 250);
        const controls = [
            this.dom.urlInput, this.dom.colorDark, this.dom.colorLight,
            this.dom.logoCircleCheckbox, this.dom.logoSizeSlider,
            this.dom.logoPositionSelect,
            this.dom.fgGradientStart, this.dom.fgGradientEnd,
            this.dom.bgGradientStart, this.dom.bgGradientEnd,
            this.dom.gradientDirectionSelect, this.dom.dotStyleSelect
        ];
        controls.forEach(control => {
            control.addEventListener('input', debouncedGenerate);
        });

        this.dom.gradientPresets.forEach(preset => {
            preset.addEventListener('click', () => this.handlePresetClick(preset));
        });

        const customSelectControls = [
            this.dom.fgGradientStart, this.dom.fgGradientEnd,
            this.dom.bgGradientStart, this.dom.bgGradientEnd
        ];
        customSelectControls.forEach(control => {
            control.addEventListener('input', () => this.selectCustomPreset());
        });

        this.dom.fillTypeSolid.addEventListener('change', () => this.updateFillOptions());
        this.dom.fillTypeGradient.addEventListener('change', () => this.updateFillOptions());

        this.dom.logoUpload.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = event => {
                    this.state.logoData = event.target.result;
                    this.generate();
                };
                reader.readAsDataURL(file);
            } else {
                this.state.logoData = null;
                this.generate();
            }
        });

        this.dom.logoSizeSlider.addEventListener('input', e => {
            this.dom.logoSizeValue.textContent = `${e.target.value}%`;
        });

        this.dom.downloadButton.addEventListener('click', () => this.download());
        this.dom.generateButton.addEventListener('click', () => this.generate());
    },

    handleTabSwitch(clickedButton) {
        this.dom.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.dom.tabContents.forEach(content => content.classList.remove('active'));

        clickedButton.classList.add('active');
        const tabName = clickedButton.dataset.tab;
        const activeContent = document.querySelector(`.tab-content[data-tab-content="${tabName}"]`);
        if (activeContent) { 
            activeContent.classList.add('active');
        }
    },

    handlePresetClick(clickedPreset) {
        const isCustom = !!clickedPreset.dataset.custom;

        if (!isCustom) {
            this.dom.fgGradientStart.value = clickedPreset.dataset.fgStart;
            this.dom.fgGradientEnd.value = clickedPreset.dataset.fgEnd;
            this.dom.bgGradientStart.value = clickedPreset.dataset.bgStart;
            this.dom.bgGradientEnd.value = clickedPreset.dataset.bgEnd;
            this.generate();
        }

        this.dom.customGradientControls.forEach(el => el.classList.toggle('hidden', !isCustom));

        this.dom.gradientPresets.forEach(p => p.classList.remove('active'));
        clickedPreset.classList.add('active');
    },
    
    selectCustomPreset() {
        this.dom.gradientPresets.forEach(p => p.classList.toggle('active', !!p.dataset.custom));
    },

    updateFillOptions(shouldGenerate = true) {
        const useGradient = this.dom.fillTypeGradient.checked;
        this.dom.solidColorOptions.forEach(el => {
            el.classList.toggle('hidden', useGradient);
        });
        this.dom.gradientOptions.forEach(el => {
            el.classList.toggle('hidden', !useGradient);
        });

        if (useGradient) {
            const activePreset = document.querySelector('.gradient-preset.active');
            const isCustom = activePreset && !!activePreset.dataset.custom;
            this.dom.customGradientControls.forEach(el => {
                el.classList.toggle('hidden', !isCustom);
            });
        } else {
            this.dom.customGradientControls.forEach(el => el.classList.add('hidden'));
        }

        if (shouldGenerate) {
            this.generate();
        }
    },

    getOptions() {
        return {
            url: this.dom.urlInput.value.trim(),
            logoData: this.state.logoData,
            colorDark: this.dom.colorDark.value,
            colorLight: this.dom.colorLight.value,
            logoSizeRatio: parseInt(this.dom.logoSizeSlider.value, 10) / 100,
            logoPosition: this.dom.logoPositionSelect.value,
            circularLogo: this.dom.logoCircleCheckbox.checked,
            dotStyle: this.dom.dotStyleSelect.value,
            useGradient: this.dom.fillTypeGradient.checked,
            fgGradientStart: this.dom.fgGradientStart.value,
            fgGradientEnd: this.dom.fgGradientEnd.value,
            bgGradientStart: this.dom.bgGradientStart.value,
            bgGradientEnd: this.dom.bgGradientEnd.value,
            gradientDirection: this.dom.gradientDirectionSelect.value
        };
    },

    async generate() {
        if (this.state.isGenerating) return;
        this.state.isGenerating = true;

        const options = this.getOptions();

        if (!options.url) {
            this.dom.qrContainer.innerHTML = '<p style="text-align:center; color:#888;">URLを入力して<br>QRコードを生成します</p>';
            this.state.isGenerating = false;
            return;
        }

        this.dom.generateButton.disabled = true;
        this.dom.generateButton.textContent = '生成中...';

        try {
            const { canvas: baseCanvas, qrInstance } = this._createBaseQr(options);
            this.state.qrInstance = qrInstance;

            const styledCanvas = this._redrawQrWithStyles(baseCanvas, options);

            const finalImageData = options.logoData
                ? await this._embedLogo(styledCanvas, options)
                : styledCanvas.toDataURL();

            this._displayQrCode(finalImageData);
        } catch (error) {
            console.error("QR Code generation failed:", error);
            this.dom.qrContainer.innerHTML = '<p style="text-align:center; color:red;">生成に失敗しました</p>';
        } finally {
            this.dom.generateButton.disabled = false;
            this.dom.generateButton.textContent = 'プレビューを更新';
            this.state.isGenerating = false;
        }
    },

    _createBaseQr(options) {
        const tempDiv = document.createElement('div');
        const qrInstance = new QRCode(tempDiv, {
            text: options.url,
            width: 256,
            height: 256,
            colorDark: options.colorDark,
            colorLight: options.colorLight,
            correctLevel: QRCode.CorrectLevel.H
        });
        const canvas = tempDiv.querySelector('canvas');
        if (!canvas) {
            throw new Error('QR code canvas generation failed.');
        }
        return { canvas, qrInstance };
    },

    _redrawQrWithStyles(originalCanvas, options) {
        if (options.dotStyle === 'square' && !options.useGradient) {
            return originalCanvas;
        }

        const qrInstance = this.state.qrInstance;
        const moduleCount = qrInstance._oQRCode.getModuleCount();
        const canvasSize = originalCanvas.width;
        const moduleSize = canvasSize / moduleCount;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvasSize;
        newCanvas.height = canvasSize;
        const ctx = newCanvas.getContext('2d');

        const isFinderPattern = (row, col) => (row <= 6 && col <= 6) || (row <= 6 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col <= 6);

        const fgStyle = options.useGradient
            ? this._createGradient(ctx, options.gradientDirection, canvasSize, options.fgGradientStart, options.fgGradientEnd)
            : options.colorDark;

        const bgStyle = options.useGradient
            ? this._createGradient(ctx, options.gradientDirection, canvasSize, options.bgGradientStart, options.bgGradientEnd)
            : options.colorLight;

        const cornerRadius = canvasSize * 0.05;
        this._roundedRectPath(ctx, 0, 0, canvasSize, canvasSize, cornerRadius);
        ctx.clip();

        ctx.fillStyle = bgStyle;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        ctx.fillStyle = fgStyle;
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qrInstance._oQRCode.isDark(row, col)) {
                    if (options.dotStyle === 'square' || isFinderPattern(row, col)) {
                        ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
                    } else { // round
                        const centerX = col * moduleSize + moduleSize / 2;
                        const centerY = row * moduleSize + moduleSize / 2;
                        const radius = moduleSize / 2 * 0.8;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
                        ctx.fill();
                    }
                }
            }
        }

        if (options.dotStyle === 'round') {
            [[0, 0], [moduleCount - 7, 0], [0, moduleCount - 7]].forEach(([col, row]) => {
                const x = col * moduleSize;
                const y = row * moduleSize;
                ctx.fillStyle = fgStyle;
                this._roundedRectPath(ctx, x, y, 7 * moduleSize, 7 * moduleSize, moduleSize * 2);
                ctx.fill();
                ctx.fillStyle = bgStyle;
                this._roundedRectPath(ctx, x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize, moduleSize * 1.5);
                ctx.fill();
                ctx.fillStyle = fgStyle;
                this._roundedRectPath(ctx, x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize, moduleSize * 1);
                ctx.fill();
            });
        }

        return newCanvas;
    },

    async _embedLogo(qrCanvas, options) {
        try {
            const qrImage = await Jimp.read(qrCanvas.toDataURL());
            const logoImage = await Jimp.read(options.logoData);

            if (options.circularLogo) {
                logoImage.circle();
            }

            const qrSize = qrImage.bitmap.width;
            const logoSize = qrSize * options.logoSizeRatio;
            logoImage.resize(logoSize, logoSize);

            const margin = qrSize * 0.05;
            let x, y;
            switch (options.logoPosition) {
                case 'top-left': x = margin; y = margin; break;
                case 'top-right': x = qrSize - logoSize - margin; y = margin; break;
                case 'bottom-left': x = margin; y = qrSize - logoSize - margin; break;
                case 'bottom-right': x = qrSize - logoSize - margin; y = qrSize - logoSize - margin; break;
                default: x = (qrSize - logoSize) / 2; y = (qrSize - logoSize) / 2;
            }

            qrImage.composite(logoImage, x, y, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacitySource: 1,
                opacityDest: 1
            });

            return await qrImage.getBase64Async(Jimp.MIME_PNG);
        } catch (error) {
            console.error("Image processing error:", error);
            alert("Failed to process the logo. Please check the file format.");
            return qrCanvas.toDataURL(); // Return original QR on failure
        }
    },

    _displayQrCode(imageData) {
        this.dom.qrContainer.innerHTML = '';
        this.state.finalImage = new Image();
        this.state.finalImage.src = imageData;
        this.dom.qrContainer.appendChild(this.state.finalImage);
        this.dom.downloadButton.disabled = false;
    },

    download() {
        if (this.state.finalImage) {
            const link = document.createElement('a');
            link.href = this.state.finalImage.src;
            link.download = 'qr_with_logo.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    _createGradient(ctx, direction, size, startColor, endColor) {
        let gradient;
        switch (direction) {
            case 'linear-h': gradient = ctx.createLinearGradient(0, 0, size, 0); break;
            case 'radial': gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); break;
            default: gradient = ctx.createLinearGradient(0, 0, 0, size);
        }
        gradient.addColorStop(0, startColor);
        gradient.addColorStop(1, endColor);
        return gradient;
    },

    _roundedRectPath(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    qrApp.init();

    // --- Hamburger Menu Logic (from common.js) ---
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const navMenu = document.getElementById('globalNav');
    const overlay = document.querySelector('.overlay');

    if (hamburgerMenu && navMenu && overlay) {
        const toggleMenu = () => {
            hamburgerMenu.classList.toggle('open');
            navMenu.classList.toggle('open');
            overlay.classList.toggle('open');
        };

        hamburgerMenu.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }
});
