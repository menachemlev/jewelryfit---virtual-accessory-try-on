import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Image Processing Service
 * Handles high-performance image preprocessing using Sharp
 */
class ImageProcessingService {
  
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
