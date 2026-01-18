/**
 * JewelryFit AI - Backend API Service
 * Integrates with Vercel Python functions and Cloud Run backend
 */

// API Configuration
const VERCEL_API_BASE = import.meta.env.VITE_API_URL || '';
const CLOUD_RUN_API = import.meta.env.VITE_BACKEND_API_URL || '';

export interface LightingAnalysisResult {
  success: boolean;
  lighting_analysis?: string;
  error?: string;
}

export interface TryOnResult {
  success: boolean;
  job_id?: string;
  output_url?: string;
  processing_time?: number;
  lighting_analysis?: string;
  error?: string;
  message?: string;
}

export interface UploadResult {
  file_id: string;
  filename: string;
  size: number;
  message: string;
}

/**
 * Convert image to base64
 */
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Analyze lighting conditions using Gemini (Vercel endpoint)
 */
export async function analyzeLighting(imageFile: File): Promise<string> {
  try {
    const base64Image = await imageToBase64(imageFile);
    
    const response = await fetch(`${VERCEL_API_BASE}/api/python/lighting_analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      })
    });

    if (!response.ok) {
      throw new Error(`Lighting analysis failed: ${response.statusText}`);
    }

    const result: LightingAnalysisResult = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Lighting analysis failed');
    }

    return result.lighting_analysis || 'Neutral diffused lighting with moderate shadows';
  } catch (error) {
    console.error('Lighting analysis error:', error);
    // Return fallback lighting description
    return 'Neutral diffused lighting with moderate shadows, balanced color temperature';
  }
}

/**
 * Process full try-on using Cloud Run backend (if available)
 */
export async function processFullTryOn(
  userImage: File,
  watchImage: File,
  addWatermark: boolean = true
): Promise<TryOnResult> {
  if (!CLOUD_RUN_API) {
    return {
      success: false,
      message: 'Full try-on processing requires Cloud Run backend. See VERCEL_DEPLOYMENT.md for setup.',
      error: 'Backend not configured'
    };
  }

  try {
    // Upload user image
    const userFormData = new FormData();
    userFormData.append('file', userImage);
    
    const userUploadResponse = await fetch(`${CLOUD_RUN_API}/api/upload/user-image`, {
      method: 'POST',
      body: userFormData
    });
    
    if (!userUploadResponse.ok) {
      throw new Error('Failed to upload user image');
    }
    
    const userUpload: UploadResult = await userUploadResponse.json();

    // Upload watch image
    const watchFormData = new FormData();
    watchFormData.append('file', watchImage);
    
    const watchUploadResponse = await fetch(`${CLOUD_RUN_API}/api/upload/watch-image`, {
      method: 'POST',
      body: watchFormData
    });
    
    if (!watchUploadResponse.ok) {
      throw new Error('Failed to upload watch image');
    }
    
    const watchUpload: UploadResult = await watchUploadResponse.json();

    // Process try-on
    const tryOnResponse = await fetch(`${CLOUD_RUN_API}/api/try-on`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_image_id: userUpload.file_id,
        watch_image_id: watchUpload.file_id,
        add_watermark: addWatermark,
        jewelry_type: 'watch'
      })
    });

    if (!tryOnResponse.ok) {
      throw new Error('Try-on processing failed');
    }

    const result: TryOnResult = await tryOnResponse.json();
    
    // Convert relative URL to absolute
    if (result.success && result.output_url) {
      result.output_url = `${CLOUD_RUN_API}${result.output_url}`;
    }

    return result;
  } catch (error) {
    console.error('Full try-on error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if Cloud Run backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  if (!CLOUD_RUN_API) {
    return false;
  }

  try {
    const response = await fetch(`${CLOUD_RUN_API}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

/**
 * Get backend configuration
 */
export function getBackendConfig() {
  return {
    vercelApi: VERCEL_API_BASE || window.location.origin,
    cloudRunApi: CLOUD_RUN_API || null,
    hasCloudRun: !!CLOUD_RUN_API,
    hasLightingAnalysis: true, // Always available on Vercel
    hasFullPipeline: !!CLOUD_RUN_API
  };
}

export const backendService = {
  analyzeLighting,
  processFullTryOn,
  checkBackendHealth,
  getBackendConfig
};
