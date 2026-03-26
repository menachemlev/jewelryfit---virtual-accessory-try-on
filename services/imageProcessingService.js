import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Image Processing Service
 * Handles high-performance image preprocessing using Sharp
 */
class ImageProcessingService {
  constructor() {
    this.handLandmarker = null;
    this.handLandmarkerInitPromise = null;
  }

  toBuffer(input) {
    if (typeof input === 'string') {
      const base64Data = input.includes(',') ? input.split(',')[1] : input;
      return Buffer.from(base64Data, 'base64');
    }
    return input;
  }

  async getHandLandmarker() {
    if (this.handLandmarker) {
      return this.handLandmarker;
    }

    if (this.handLandmarkerInitPromise) {
      return this.handLandmarkerInitPromise;
    }

    this.handLandmarkerInitPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        join(process.cwd(), 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
        },
        numHands: 1,
        runningMode: 'IMAGE'
      });

      return this.handLandmarker;
    })();

    return this.handLandmarkerInitPromise;
  }

  getFingerIndices(finger) {
    const mapping = {
      THUMB: [1, 2, 3, 4],
      INDEX: [5, 6, 7, 8],
      MIDDLE: [9, 10, 11, 12],
      RING: [13, 14, 15, 16],
      PINKY: [17, 18, 19, 20]
    };

    return mapping[finger] || mapping.RING;
  }
  
  /**
   * Optimize image for AI processing
   * - Resizes to max 1080p on long edge
   * - Converts to WebP format
   * - Maintains aspect ratio
   * 
   * @param {Buffer|string} input - Image buffer or base64 string
   * @returns {Promise<{buffer: Buffer, base64: string, mimeType: string}>}
   */
  async optimizeImageForAI(input) {
    try {
      let buffer;
      
      // Handle base64 input
      if (typeof input === 'string') {
        const base64Data = input.includes(',') ? input.split(',')[1] : input;
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = input;
      }

      // Get original metadata
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      // Determine if resizing is needed
      const maxDimension = 1080;
      const needsResize = width > maxDimension || height > maxDimension;

      let processedImage = sharp(buffer);

      if (needsResize) {
        // Resize maintaining aspect ratio
        if (width > height) {
          processedImage = processedImage.resize({ width: maxDimension });
        } else {
          processedImage = processedImage.resize({ height: maxDimension });
        }
      }

      // Convert to WebP for optimal AI processing
      const optimizedBuffer = await processedImage
        .webp({ quality: 90 })
        .toBuffer();

      const base64 = optimizedBuffer.toString('base64');

      return {
        buffer: optimizedBuffer,
        base64,
        mimeType: 'image/webp'
      };
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  async detectFingerRegion(input, finger = 'RING') {
    const buffer = this.toBuffer(input);
    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const handLandmarker = await this.getHandLandmarker();
    const result = handLandmarker.detect(canvas);

    const landmarks = result?.landmarks?.[0];
    if (!landmarks || landmarks.length < 21) {
      return null;
    }

    const fingerIndices = this.getFingerIndices(finger);
    const fingerPoints = fingerIndices.map((idx) => ({
      x: landmarks[idx].x * image.width,
      y: landmarks[idx].y * image.height
    }));

    const mcpPoint = fingerPoints[0];
    const pipPoint = fingerPoints[1] || fingerPoints[0];
    const tipPoint = fingerPoints[fingerPoints.length - 1];

    const fingerLength = Math.max(
      40,
      Math.hypot(tipPoint.x - mcpPoint.x, tipPoint.y - mcpPoint.y)
    );

    const xs = fingerPoints.map((p) => p.x);
    const ys = fingerPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const paddingX = Math.max(50, Math.round(fingerLength * 0.9));
    const paddingY = Math.max(60, Math.round(fingerLength * 0.95));

    const left = Math.max(0, Math.floor(minX - paddingX));
    const top = Math.max(0, Math.floor(minY - paddingY));
    const right = Math.min(image.width, Math.ceil(maxX + paddingX));
    const bottom = Math.min(image.height, Math.ceil(maxY + paddingY));

    const width = Math.max(200, right - left);
    const height = Math.max(200, bottom - top);

    const ringAnchor = {
      x: mcpPoint.x + (pipPoint.x - mcpPoint.x) * 0.35,
      y: mcpPoint.y + (pipPoint.y - mcpPoint.y) * 0.35
    };

    const fingerAngleDegrees = Math.atan2(pipPoint.y - mcpPoint.y, pipPoint.x - mcpPoint.x) * (180 / Math.PI);
    const estimatedBandWidth = Math.max(34, Math.round(fingerLength * 0.55));

    return {
      imageSize: { width: image.width, height: image.height },
      crop: {
        left,
        top,
        width: Math.min(width, image.width - left),
        height: Math.min(height, image.height - top)
      },
      ringAnchor,
      ringAngleDegrees: fingerAngleDegrees + 90,
      estimatedBandWidth
    };
  }

  async removeNearWhiteBackground(input) {
    const buffer = this.toBuffer(input);
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const brightness = (r + g + b) / 3;

      if (brightness > 245 && saturation < 0.08) {
        data[i + 3] = 0;
      } else if (brightness > 228 && saturation < 0.13) {
        data[i + 3] = Math.min(data[i + 3], 35);
      } else if (brightness > 210 && saturation < 0.18) {
        data[i + 3] = Math.min(data[i + 3], 95);
      }
    }

    return sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
      .trim()
      .png()
      .toBuffer();
  }

  async buildGuidedRingComposite(baseImage, accessoryImage, finger = 'RING') {
    const baseBuffer = this.toBuffer(baseImage);
    const region = await this.detectFingerRegion(baseBuffer, finger);

    if (!region) {
      return null;
    }

    const cropBuffer = await sharp(baseBuffer)
      .extract(region.crop)
      .png()
      .toBuffer();

    const ringNoBg = await this.removeNearWhiteBackground(accessoryImage);

    const ringOverlay = await sharp(ringNoBg)
      .resize({
        width: region.estimatedBandWidth,
        fit: 'inside',
        withoutEnlargement: false
      })
      .rotate(region.ringAngleDegrees, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const ringMeta = await sharp(ringOverlay).metadata();
    const overlayLeft = Math.max(0, Math.round(region.ringAnchor.x - region.crop.left - (ringMeta.width || 0) / 2));
    const overlayTop = Math.max(0, Math.round(region.ringAnchor.y - region.crop.top - (ringMeta.height || 0) / 2));

    const guidedCropBuffer = await sharp(cropBuffer)
      .composite([
        {
          input: ringOverlay,
          left: overlayLeft,
          top: overlayTop,
          blend: 'over'
        }
      ])
      .png()
      .toBuffer();

    return {
      cropRect: region.crop,
      cropBuffer,
      guidedCropBuffer,
      accessoryNoBgBuffer: ringNoBg,
      mimeType: 'image/png'
    };
  }

  async reattachEditedCrop(fullImage, editedCrop, cropRect) {
    const fullBuffer = this.toBuffer(fullImage);
    const editedBuffer = this.toBuffer(editedCrop);
    const resizedEditedCrop = await sharp(editedBuffer)
      .resize({
        width: cropRect.width,
        height: cropRect.height,
        fit: 'fill'
      })
      .png()
      .toBuffer();

    return sharp(fullBuffer)
      .composite([
        {
          input: resizedEditedCrop,
          left: cropRect.left,
          top: cropRect.top,
          blend: 'over'
        }
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  /**
   * Create watermarked version of image
   * Overlays a semi-transparent pattern over the entire image
   * 
   * @param {Buffer|string} input - Clean image buffer or base64
   * @param {object} options - Watermark options
   * @returns {Promise<{buffer: Buffer, base64: string}>}
   */
  async applyWatermark(input, options = {}) {
    try {
      let buffer;
      
      // Handle base64 input
      if (typeof input === 'string') {
        const base64Data = input.includes(',') ? input.split(',')[1] : input;
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = input;
      }

      const {
        opacity = 0.3,
        pattern = 'diagonal',
        text = 'JewelryFit',
        color = { r: 255, g: 255, b: 255 }
      } = options;

      // Get image dimensions
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      // Create watermark SVG pattern
      const watermarkSVG = this.createWatermarkSVG(width, height, text, opacity, pattern, color);

      // Composite watermark onto image
      const watermarkedBuffer = await sharp(buffer)
        .composite([{
          input: Buffer.from(watermarkSVG),
          blend: 'over'
        }])
        .toBuffer();

      const base64 = watermarkedBuffer.toString('base64');

      return {
        buffer: watermarkedBuffer,
        base64,
        mimeType: metadata.format === 'png' ? 'image/png' : 'image/jpeg'
      };
    } catch (error) {
      console.error('Error applying watermark:', error);
      throw new Error(`Watermarking failed: ${error.message}`);
    }
  }

  /**
   * Create SVG watermark pattern
   * @private
   */
  createWatermarkSVG(width, height, text, opacity, pattern, color) {
    const { r, g, b } = color;
    const rgbaColor = `rgba(${r},${g},${b},${opacity})`;
    
    if (pattern === 'diagonal') {
      // Diagonal repeating text pattern
      const spacing = 200;
      const angle = -45;
      let textElements = '';
      
      for (let y = -height; y < height * 2; y += spacing) {
        for (let x = -width; x < width * 2; x += spacing) {
          textElements += `
            <text 
              x="${x}" 
              y="${y}" 
              transform="rotate(${angle} ${x} ${y})"
              font-family="Arial, sans-serif" 
              font-size="24" 
              font-weight="bold"
              fill="${rgbaColor}"
            >${text}</text>
          `;
        }
      }

      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          ${textElements}
        </svg>
      `;
    } else if (pattern === 'center') {
      // Large centered watermark
      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text 
            x="50%" 
            y="50%" 
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="Arial, sans-serif" 
            font-size="${Math.min(width, height) * 0.15}" 
            font-weight="bold"
            fill="${rgbaColor}"
            transform="rotate(-45 ${width/2} ${height/2})"
          >${text}</text>
        </svg>
      `;
    } else {
      // Grid pattern
      const spacing = 150;
      let textElements = '';
      
      for (let y = spacing; y < height; y += spacing) {
        for (let x = spacing; x < width; x += spacing) {
          textElements += `
            <text 
              x="${x}" 
              y="${y}" 
              text-anchor="middle"
              font-family="Arial, sans-serif" 
              font-size="18" 
              font-weight="600"
              fill="${rgbaColor}"
            >${text}</text>
          `;
        }
      }

      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          ${textElements}
        </svg>
      `;
    }
  }

  /**
   * Convert buffer to various formats
   * @param {Buffer} buffer - Image buffer
   * @param {string} format - Target format (jpeg, png, webp)
   * @param {object} options - Format-specific options
   * @returns {Promise<Buffer>}
   */
  async convertFormat(buffer, format = 'jpeg', options = {}) {
    try {
      let converter = sharp(buffer);

      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          return await converter.jpeg({ quality: options.quality || 90 }).toBuffer();
        case 'png':
          return await converter.png({ quality: options.quality || 90 }).toBuffer();
        case 'webp':
          return await converter.webp({ quality: options.quality || 90 }).toBuffer();
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('Error converting format:', error);
      throw new Error(`Format conversion failed: ${error.message}`);
    }
  }

  /**
   * Get image metadata
   * @param {Buffer|string} input - Image buffer or base64
   * @returns {Promise<object>}
   */
  async getMetadata(input) {
    try {
      let buffer;
      
      if (typeof input === 'string') {
        const base64Data = input.includes(',') ? input.split(',')[1] : input;
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = input;
      }

      return await sharp(buffer).metadata();
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Validate image suitability for processing
   * @param {Buffer|string} input - Image buffer or base64
   * @returns {Promise<{valid: boolean, reason?: string}>}
   */
  async validateImage(input) {
    try {
      const metadata = await this.getMetadata(input);
      const { width, height, size, format } = metadata;

      // Check if image is too small
      if (width < 200 || height < 200) {
        return {
          valid: false,
          reason: 'Image is too small. Minimum dimensions are 200x200 pixels.'
        };
      }

      // Check if image is too large (before optimization)
      const maxPixels = 4000 * 4000; // 16MP
      if (width * height > maxPixels) {
        return {
          valid: false,
          reason: 'Image is too large. Maximum resolution is 4000x4000 pixels.'
        };
      }

      // Check supported formats
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!supportedFormats.includes(format)) {
        return {
          valid: false,
          reason: `Unsupported format: ${format}. Supported formats: ${supportedFormats.join(', ')}`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid image file: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export default new ImageProcessingService();
