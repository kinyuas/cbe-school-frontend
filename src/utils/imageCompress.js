// src/utils/imageCompress.js

/**
 * Compress an image file to a base64 data URL under a target size.
 * Uses canvas to downscale + JPEG-encode, which typically reduces a
 * phone photo (3–5 MB) to under 300 KB.
 *
 * @param {File} file - the input image
 * @param {Object} opts - { maxWidth, maxHeight, quality, maxBytes }
 * @returns {Promise<string>} base64 data URL
 */
export const compressImage = (file, opts = {}) => {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.85,
    maxBytes = 500 * 1024,
  } = opts;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        // Fit within maxWidth × maxHeight while preserving aspect ratio
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // White background (helps JPEGs of transparent PNGs)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try progressively lower quality until under maxBytes
        let q = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', q);
        while (dataUrl.length * 0.75 > maxBytes && q > 0.4) {
          q -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', q);
        }

        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
};