import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Initialize Gemini client (Server-side only)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in environment variables');
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for exponential backoff
const callWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    const isRateLimit = 
      error.status === 429 || 
      error.code === 429 || 
      (error.message && (error.message.includes('429') || error.message.includes('Quota exceeded') || error.message.includes('RESOURCE_EXHAUSTED')));

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// ============ ENDPOINTS ============

/**
 * POST /api/detect-accessory-type
 * Detects the type of accessory (WATCH, BRACELET, or RING)
 */
app.post('/api/detect-accessory-type', async (req, res) => {
  try {
    const { baseImage } = req.body;
    
    if (!baseImage) {
      return res.status(400).json({ error: 'baseImage is required' });
    }

    const ai = getGeminiClient();
    const base64Data = baseImage.split(',')[1] || baseImage;

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: "Classify the single accessory in this image as exactly one of these three types: 'WATCH', 'BRACELET', or 'RING'. Return only the word." }
        ]
      }
    }));

    const text = response.text?.trim().toUpperCase();
    let accessoryType = 'WATCH'; // Default
    
    if (text?.includes('WATCH')) accessoryType = 'WATCH';
    else if (text?.includes('RING')) accessoryType = 'RING';
    else if (text?.includes('BRACELET')) accessoryType = 'BRACELET';

    res.json({ accessoryType });
  } catch (error) {
    console.error('Error in detect-accessory-type:', error);
    res.status(500).json({ error: error.message || 'Failed to detect accessory type' });
  }
});

/**
 * POST /api/validate-image-suitability
 * Validates if the image is suitable for try-on
 */
app.post('/api/validate-image-suitability', async (req, res) => {
  try {
    const { baseImage, type } = req.body;
    
    if (!baseImage || !type) {
      return res.status(400).json({ error: 'baseImage and type are required' });
    }

    const ai = getGeminiClient();
    const base64Data = baseImage.split(',')[1] || baseImage;

    const instruction = type === 'RING' 
      ? "Check if this image clearly shows a hand where a ring could be placed. The hand should be visible, relatively flat or in a natural pose, and not too blurry. Return JSON: { \"suitable\": boolean, \"issue\": string | null }. Issue should be short string if not suitable."
      : "Check if this image clearly shows a wrist or arm where a watch/bracelet could be placed. The wrist area should be visible (not covered by long sleeves) and not too blurry. Return JSON: { \"suitable\": boolean, \"issue\": string | null }. Issue should be short string if not suitable.";

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: instruction }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suitable: { type: Type.BOOLEAN },
            issue: { type: Type.STRING, nullable: true }
          },
          required: ['suitable']
        }
      }
    }));

    const json = JSON.parse(response.text || '{}');
    res.json({
      suitable: json.suitable,
      issue: json.issue
    });
  } catch (error) {
    console.error('Error in validate-image-suitability:', error);
    res.status(500).json({ error: error.message || 'Failed to validate image' });
  }
});

/**
 * POST /api/generate-try-on-image
 * Generates the try-on image with accessory placed on the base image
 */
app.post('/api/generate-try-on-image', async (req, res) => {
  try {
    const { baseImage, accessoryImage, type, finger = 'RING' } = req.body;
    
    if (!baseImage || !accessoryImage || !type) {
      return res.status(400).json({ error: 'baseImage, accessoryImage, and type are required' });
    }

    const ai = getGeminiClient();
    
    const baseData = baseImage.split(',')[1] || baseImage;
    const accData = accessoryImage.split(',')[1] || accessoryImage;

    const commonInstruction = "Strictly maintain the original camera angle, perspective, focal length, and composition of the Base image. Do not crop, zoom, or alter the background. The output must look exactly like the original photo but with the accessory added.";

    let prompt = "";
    if (type === 'WATCH') {
      prompt = `A hyper-realistic photo editing task. The user has provided two images: 1) A photo of a person's wrist/arm (Base). 2) A photo of a watch face/strap (Accessory). 
      Task: Wear the watch on the wrist in the Base image. 
      ${commonInstruction}
      Scale the watch perfectly to fit the wrist size in the current perspective. Rotate it to match the arm's angle. Add realistic shadows cast by the watch onto the skin. Adjust the watch's lighting to match the scene. Maintain high resolution and skin texture.`;
    } else if (type === 'BRACELET') {
      prompt = `A hyper-realistic photo editing task. The user has provided two images: 1) A photo of a person's wrist/arm (Base). 2) A photo of a bracelet (Accessory). 
      Task: Place the bracelet around the wrist in the Base image. 
      ${commonInstruction}
      It should look natural, following the curvature of the wrist in the current perspective. Add realistic contact shadows. Adjust lighting to match the skin tone and environment.`;
    } else {
      // Ring Logic with Fingers
      const fingerName = finger.toLowerCase();
      prompt = `A hyper-realistic photo editing task. The user has provided two images: 1) A photo of a person's hand (Base). 2) A photo of a ring (Accessory). 
      Task: Place the ring on the ${fingerName} finger of the hand in the Base image. 
      ${commonInstruction}
      Position it at the base of the ${fingerName} finger where a ring naturally sits. Scale it to fit the finger width perfectly. Rotate it to align with the finger's direction in the current perspective. Add realistic shadows and reflections. Ensure the ring looks like it is encircling the finger.`;
    }

    // Select model based on complexity
    // Use pro model for difficult fingers (THUMB, PINKY, MIDDLE) on rings
    const useProModel = type === 'RING' && (finger !== 'RING');
    const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const response = await callWithRetry(() => ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: baseData } },
          { inlineData: { mimeType: 'image/jpeg', data: accData } }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    }));

    // Find the image in the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return res.json({ 
          image: `data:image/png;base64,${part.inlineData.data}` 
        });
      }
    }

    throw new Error('No image generated by AI');
  } catch (error) {
    console.error('Error in generate-try-on-image:', error);
    res.status(500).json({ error: error.message || 'Failed to generate try-on image' });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('GEMINI_API_KEY is', process.env.GEMINI_API_KEY ? 'configured' : 'NOT configured');
});
