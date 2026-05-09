import { GoogleGenAI } from '@google/genai';
import { serverlessDbService } from './serverless-db.js';
import { authenticateToken } from '../api/users/_middleware.js';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in environment variables');
  }
  return new GoogleGenAI({ apiKey });
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

    const commonInstruction = "CRITICAL INSTRUCTIONS: This is a photorealistic image editing task. You must strictly maintain the original camera angle, perspective, focal length, background, and skin tone of the Base image. Do not crop or zoom. Seamlessly blend the accessory into the image using advanced image editing techniques: match the environmental lighting, apply correct ambient occlusion, and generate realistic contact shadows cast by the accessory onto the skin to completely avoid a flat, 'pasted-on' sticker look.";

    let prompt = "";
    if (type === 'WATCH') {
      prompt = `A hyper-realistic photo editing task. Inputs: 1) A photo of a person's wrist/arm (Base). 2) A photo of a watch (Accessory). 
      Task: Wear the watch on the wrist in the Base image. 
      ${commonInstruction}
      Scale the watch perfectly to fit the wrist size in the current perspective. Rotate it to match the arm's angle. Add realistic contact shadows cast by the watch face and strap onto the skin. Adjust the watch's metallic and glass reflections to match the ambient room lighting. Maintain high resolution and natural skin texture around the watch.`;
    } else if (type === 'BRACELET') {
      prompt = `A hyper-realistic photo editing task. Inputs: 1) A photo of a person's wrist/arm (Base). 2) A photo of a bracelet (Accessory). 
      Task: Place the bracelet around the wrist in the Base image. 
      ${commonInstruction}
      It must look completely natural, following the physical curvature of the wrist. The back half of the bracelet must be hidden behind the wrist to simulate 3D volume. Add realistic drop shadows and adjust lighting to match the skin tone and environment perfectly.`;
    } else {
      const fingerName = finger.toLowerCase();
      
      // Mapping for precise anatomical placement
      const fingerDescriptions = {
        'thumb': 'thumb (the thickest, outermost digit)',
        'index': 'index finger (the pointer finger, located right next to the thumb)',
        'middle': 'middle finger (the longest, central digit)',
        'ring': 'ring finger (the fourth digit, located between the middle and pinky fingers)',
        'pinky': 'pinky finger (the smallest, outermost digit on the far edge of the hand)'
      };
      const explicitFingerDescription = fingerDescriptions[fingerName] || fingerName;
      const ringCircumference = ringSize; 

      prompt = `A hyper-realistic photo composition task. 
      Inputs: 1) Base image of a hand. 2) Accessory image of a ring.
      Task: Place the ring SPECIFICALLY AND ONLY on the ${explicitFingerDescription}. 
      ${commonInstruction}
      Specific details for realism:
      1. Location: MUST be strictly on the ${explicitFingerDescription}. Position it at the natural base of this specific finger.
      2. 3D Volume: The ring size is EU ${ringCircumference} (${ringCircumference}mm). Scale it precisely. The ring must wrap physically around the cylindrical shape of the finger. The back portion of the ring MUST be hidden behind the finger.
      3. Integration: Add soft, realistic drop shadows directly beneath the ring where it touches the skin. Add specular highlights and reflections on the ring's material that match the light source of the base photo. Soften the outer edges of the ring very slightly to blend naturally with the skin pixels.`;
    }
    
    // Model selection
    const useProModel = type === 'RING' && (finger !== 'RING');
    const modelName = 'gemini-3-pro-image-preview';

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
        return res.status(200).json({ 
          image: `data:image/png;base64,${part.inlineData.data}` 
        });
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
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).send(JSON.stringify({ error: 'Internal server error' }));
    }
  }
}