import { AccessoryType, Language, Finger, RingSize } from "../types";
import { authToken } from './authService';

// Server URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function to call the server API with JWT authentication
const callServerAPI = async <T>(endpoint: string, payload: any): Promise<T> => {
  const token = authToken.get();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (parseError) {
      // Response wasn't JSON, try to get text
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch (textError) {
        // Keep default error message
      }
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json() as Promise<T>;
  } catch (parseError) {
    console.error('Failed to parse JSON response:', parseError);
    throw new Error('Invalid response format from server');
  }
};

// --- IMAGE PROCESSING HELPERS ---

interface ImageStats {
  brightness: number; // 0-255 (Average Luminance)
  warmth: number;     // Positive = Warm (Red dominant), Negative = Cool (Blue dominant)
  contrast: number;   // Standard Deviation of brightness (0-128 approx)
}
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
  finger: Finger = 'RING',
  ringSize: RingSize = '58'
): Promise<string> => {
  try {
    const result = await callServerAPI<{ image: string }>(
      '/api/generate-try-on-image',
      {
        baseImage: baseImageBase64,
        accessoryImage: accessoryImageBase64,
        type,
        finger,
        ringSize
      }
    );
    return result.image;
  } catch (error) {
    console.error("Try-on generation failed:", error);
    throw error;
  }
};
