import { AccessoryType, Language, Finger } from "../types";

// Server URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function to call the server API
const callServerAPI = async <T>(endpoint: string, payload: any): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

// --- IMAGE PROCESSING HELPERS ---

interface ImageStats {
  brightness: number; // 0-255 (Average Luminance)
  warmth: number;     // Positive = Warm (Red dominant), Negative = Cool (Blue dominant)
  contrast: number;   // Standard Deviation of brightness (0-128 approx)
}

/**
 * Analyzes the Base Image (Hand/Wrist) to understand the room's lighting conditions.
 */
const analyzeLightingConditions = (base64: string): Promise<ImageStats> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Downscale for performance - we only need average stats
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ brightness: 128, warmth: 0, contrast: 40 }); 
        return;
      }

      ctx.drawImage(img, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;
      
      let totalLum = 0;
      let totalR = 0;
      let totalB = 0;
      const luminances: number[] = [];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Perceived Luminance (Human eye sensitivity)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLum += lum;
        luminances.push(lum);
        
        totalR += r;
        totalB += b;
      }
      
      const pixelCount = data.length / 4;
      const avgLum = totalLum / pixelCount;
      const avgR = totalR / pixelCount;
      const avgB = totalB / pixelCount;

      // Calculate Contrast (Standard Deviation of Luminance)
      const sumSqDiff = luminances.reduce((acc, val) => acc + Math.pow(val - avgLum, 2), 0);
      const contrast = Math.sqrt(sumSqDiff / pixelCount);

      resolve({
        brightness: avgLum,
        warmth: avgR - avgB,
        contrast: contrast
      });
    };
    
    img.onerror = () => resolve({ brightness: 128, warmth: 0, contrast: 40 });
    img.src = base64;
  });
};

/**
 * Adjusts the Accessory Image to match the lighting of the Base Image.
 * Applies Exposure, Contrast matching, Saturation adaptation, and Color Tinting.
 */
const preProcessAccessory = (base64: string, envStats: ImageStats): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // --- CALCULATE ADJUSTMENT FACTORS ---

      // 1. Brightness / Exposure
      // Normalize room brightness around 128 (mid-gray).
      // We clamp the ratio to avoid destroying the image in extreme conditions (pitch black/white room).
      // Range: 0.6 (Darken) to 1.4 (Brighten)
      const brightnessRatio = Math.max(0.6, Math.min(1.4, envStats.brightness / 120)); 

      // 2. Contrast Matching
      // Standard deviation of ~50 is a "balanced" image.
      // < 30 is flat/foggy. > 70 is harsh/high-contrast.
      // We adjust the accessory to match the room's "hardness" of light.
      const contrastFactor = Math.max(0.7, Math.min(1.3, envStats.contrast / 50));

      // 3. Adaptive Saturation
      // Dark environments cause the human eye to perceive less color (Rod vs Cone cells).
      // If brightness is low (< 60), we desaturate.
      // If brightness is high, we ensure vibrancy.
      let saturationFactor = 1.0;
      if (envStats.brightness < 60) saturationFactor = 0.80;
      else if (envStats.brightness > 180) saturationFactor = 1.1;

      // 4. Color Temperature (Tint)
      // `envStats.warmth` is (AvgRed - AvgBlue).
      // If positive, room is warm (Incandescent/Golden Hour). If negative, room is cool (Shadow/Fluorescent).
      // We apply ~40% of the room's bias to the accessory to integrate it.
      const tintShift = envStats.warmth * 0.4;

      // --- PIXEL PROCESSING LOOP ---
      for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels
        if (data[i + 3] === 0) continue;

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // A. Apply Exposure (Brightness)
        r *= brightnessRatio;
        g *= brightnessRatio;
        b *= brightnessRatio;

        // B. Apply Contrast
        // Formula: color = (color - 128) * factor + 128
        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;

        // C. Apply Saturation (Grayscale Interpolation)
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturationFactor;
        g = gray + (g - gray) * saturationFactor;
        b = gray + (b - gray) * saturationFactor;

        // D. Apply Tint (Warmth)
        // Add to Red, Subtract from Blue (or vice versa)
        r += tintShift;
        b -= tintShift;

        // Clamp values to 0-255
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };
    
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

/**
 * 1. Detect Accessory Type (Watch, Bracelet, Ring)
 */
export const detectAccessoryType = async (base64Image: string): Promise<AccessoryType> => {
  try {
    const result = await callServerAPI<{ accessoryType: AccessoryType }>(
      '/api/detect-accessory-type',
      { baseImage: base64Image }
    );
    return result.accessoryType;
  } catch (error) {
    console.warn("Detection failed, defaulting to WATCH", error);
    return 'WATCH';
  }
};

/**
 * 2. Validate Image Suitability
 */
export const validateImageSuitability = async (
  base64Image: string, 
  type: AccessoryType, 
  lang: Language,
  validMsg: string,
  invalidMsg: string
): Promise<{ suitable: boolean; message?: string }> => {
  try {
    const result = await callServerAPI<{ suitable: boolean; issue: string | null }>(
      '/api/validate-image-suitability',
      { baseImage: base64Image, type }
    );
    return {
      suitable: result.suitable,
      message: result.suitable ? validMsg : (result.issue || invalidMsg)
    };
  } catch (error) {
    console.warn("Validation failed, assuming valid", error);
    return { suitable: true };
  }
};

/**
 * 3. Generate Try-On Image (Standard)
 */
export const generateTryOnImage = async (
  baseImageBase64: string, 
  accessoryImageBase64: string, 
  type: AccessoryType,
  finger: Finger = 'RING'
): Promise<string> => {
  try {
    const result = await callServerAPI<{ image: string }>(
      '/api/generate-try-on-image',
      {
        baseImage: baseImageBase64,
        accessoryImage: accessoryImageBase64,
        type,
        finger
      }
    );
    return result.image;
  } catch (error) {
    console.error("Try-on generation failed:", error);
    throw error;
  }
};
