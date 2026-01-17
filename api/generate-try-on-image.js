import { GoogleGenAI } from '@google/genai';
import { serverlessDbService } from './serverless-db.js';
import { authenticateToken } from './users/_middleware.js';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in environment variables');
  }
  return new GoogleGenAI(apiKey);
};

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

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const userId = authenticateToken(req);
    
    // Check if user has credits or is in unlimited list
    const unlimited_credits_users = process.env.UNLIMITED_CREDITS_USERS_LIST?.split(',').map(id => id.trim()) || [];
    const isUnlimited = unlimited_credits_users.includes(userId);
    
    if (!isUnlimited) {
      const credits = serverlessDbService.getUserCredits(userId);
      if (credits <= 0) {
        return res.status(402).json({ error: 'Insufficient credits. Please purchase more credits to continue.' });
      }
    }
    
    const { baseImage, accessoryImage, type, finger = 'RING', ringSize = '58' } = req.body;
    
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
      const fingerName = finger.toLowerCase();
      const ringCircumference = ringSize; // EU size = circumference in mm
      prompt = `A hyper-realistic photo editing task. The user has provided two images: 1) A photo of a person's hand (Base). 2) A photo of a ring (Accessory). 
      Task: Place the ring on the ${fingerName} finger of the hand in the Base image. 
      ${commonInstruction}
      Position it at the base of the ${fingerName} finger where a ring naturally sits. The ring size is EU ${ringCircumference} (${ringCircumference}mm circumference) - scale the ring to match this specific finger circumference perfectly. Rotate it to align with the finger's direction in the current perspective. Add realistic shadows and reflections. Ensure the ring looks like it is encircling the finger snugly.`;
    }
    
    // Use pro model for difficult fingers
    const useProModel = type === 'RING' && (finger !== 'RING');
    //const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    const modelName = 'gemini-3-pro-image-preview';

    const response = await callWithRetry(async () => {
      return await ai.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: baseData
                }
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: accData
                }
              }
            ]
          }
        ]
      });
    });

    // Find the image in the response
    const candidates = response?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return res.status(200).json({ 
            image: `data:image/png;base64,${part.inlineData.data}` 
          });
        }
      }
    }

    throw new Error('No image generated by AI');
  } catch (error) {
    console.error('Error in generate-try-on-image:', error);
    
    // Handle authentication errors
    if (error.message === 'Access token required') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message === 'Invalid or expired token') {
      return res.status(403).json({ error: error.message });
    }
    
    // Ensure we always return valid JSON
    const errorMessage = error.message || 'Failed to generate try-on image';
    
    try {
      return res.status(500).json({ error: errorMessage });
    } catch (jsonError) {
      // Fallback if JSON stringification fails
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).send(JSON.stringify({ error: 'Internal server error' }));
    }
  }
}
