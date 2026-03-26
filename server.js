import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import dbService from './database.js';
import imageProcessingService from './services/imageProcessingService.js';
import geminiAIService from './services/geminiAIService.js';
import cacheService from './services/cacheService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// ============ RATE LIMITING ============
// Guest users: 10 requests per 1 minute
const guestRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests from this IP. Please wait a moment or log in.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users
    const authHeader = req.headers['authorization'];
    return authHeader && authHeader.startsWith('Bearer ');
  }
});

// Authenticated users: 50 requests per 1 minute
const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// JWT Token Generation
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Auth Middleware (optional - doesn't block if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.userId = decoded.userId;
        req.isAuthenticated = true;
      }
    });
  }
  
  req.isAuthenticated = req.isAuthenticated || false;
  next();
};

// Auth Middleware (required)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    req.isAuthenticated = true;
    next();
  });
};

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

const VALID_RING_FINGERS = ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'];

const normalizeRingFinger = (finger) => {
  const normalized = String(finger || 'RING').toUpperCase();
  return VALID_RING_FINGERS.includes(normalized) ? normalized : 'RING';
};

const getFingerDisplayName = (finger) => {
  const names = {
    THUMB: 'thumb',
    INDEX: 'index (pointer)',
    MIDDLE: 'middle',
    RING: 'ring',
    PINKY: 'pinky (little)'
  };
  return names[finger] || 'ring';
};

const extractGeneratedImageBase64 = (response) => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return part.inlineData.data;
    }
  }
  return null;
};

const verifyRingFingerPlacement = async (ai, imageBase64, targetFinger) => {
  try {
    const validationResponse = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          {
            text: `Analyze this image and check where the ring is worn.
Target finger: ${targetFinger}.
Return JSON only in this exact format:
{ "correct": boolean, "observedFinger": "THUMB|INDEX|MIDDLE|RING|PINKY|NONE" }
Set correct=true only if the ring is clearly on the target finger.`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correct: { type: Type.BOOLEAN },
            observedFinger: { type: Type.STRING }
          },
          required: ['correct', 'observedFinger']
        }
      }
    }));

    const parsed = JSON.parse(validationResponse.text || '{}');
    return {
      correct: Boolean(parsed.correct),
      observedFinger: String(parsed.observedFinger || 'NONE').toUpperCase()
    };
  } catch (error) {
    console.warn('Ring finger placement validation skipped:', error.message);
    // Fail open: do not block response if validation model fails.
    return { correct: true, observedFinger: 'NONE' };
  }
};

// ============ ENDPOINTS ============

/**
 * POST /api/users/register
 * Create or get user and return with credits and JWT token
 */
app.post('/api/users/register', async (req, res) => {
  try {
    const { userId, email, name, provider } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = dbService.getOrCreateUser(userId, { email, name, provider });
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    res.json({ 
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      credits: user.credits,
      token
    });
  } catch (error) {
    console.error('Error in users/register:', error);
    res.status(500).json({ error: error.message || 'Failed to register user' });
  }
});

/**
 * GET /api/users/:userId/credits
 * Get user's current credit balance
 */
app.get('/api/users/:userId/credits', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the userId matches the authenticated user
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }

    const credits = dbService.getUserCredits(userId);
    res.json({ credits });
  } catch (error) {
    console.error('Error in get credits:', error);
    res.status(500).json({ error: error.message || 'Failed to get credits' });
  }
});

/**
 * POST /api/users/:userId/credits/deduct
 * Deduct credits from user
 */
app.post('/api/users/:userId/credits/deduct', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount = 1 } = req.body;
    
    // Verify the userId matches the authenticated user
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }

    const success = dbService.deductCredits(userId, amount);
    
    if (!success) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    const newCredits = dbService.getUserCredits(userId);
    res.json({ success: true, credits: newCredits });
  } catch (error) {
    console.error('Error in deduct credits:', error);
    res.status(500).json({ error: error.message || 'Failed to deduct credits' });
  }
});

/**
 * POST /api/users/:userId/credits/add
 * Add credits to user
 */
app.post('/api/users/:userId/credits/add', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    // Verify the userId matches the authenticated user
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }
    
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const newCredits = dbService.addCredits(userId, amount);
    res.json({ success: true, credits: newCredits });
  } catch (error) {
    console.error('Error in add credits:', error);
    res.status(500).json({ error: error.message || 'Failed to add credits' });
  }
});

/**
 * POST /api/detect-accessory-type
 * Detects the type of accessory (WATCH, BRACELET, or RING)
 */
app.post('/api/detect-accessory-type', authenticateToken, async (req, res) => {
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
app.post('/api/validate-image-suitability', authenticateToken, async (req, res) => {
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
app.post('/api/generate-try-on-image', authenticateToken, async (req, res) => {
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
      const normalizedFinger = normalizeRingFinger(finger);
      const fingerName = getFingerDisplayName(normalizedFinger);
      prompt = `A hyper-realistic photo editing task. The user has provided two images: 1) A photo of a person's hand (Base). 2) A photo of a ring (Accessory). 
      Task: Place the ring on the ${fingerName} finger of the hand in the Base image. 
      ${commonInstruction}
      CRITICAL TARGET: The ring MUST be on ${normalizedFinger} only. Do NOT place it on any other finger.
      Position it at the base of the ${fingerName} finger where a ring naturally sits. Scale it to fit the finger width perfectly. Rotate it to align with the finger's direction in the current perspective. Add realistic shadows and reflections. Ensure the ring looks like it is encircling the finger.
      If the ${fingerName} finger is partially occluded, still keep placement on that same finger using visible landmarks and never switch to a different finger.`;
    }
    
    const modelName = 'gemini-3-pro-image-preview';

    const normalizedFinger = normalizeRingFinger(finger);
    const maxAttempts = type === 'RING' ? 2 : 1;
    let finalImageBase64 = null;
    let observedFinger = 'NONE';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const retryInstruction = type === 'RING' && attempt > 1
        ? `\nRETRY FIX: Previous output placed the ring on ${observedFinger}. This is incorrect. Regenerate and place the ring ONLY on ${normalizedFinger}.`
        : '';

      const response = await callWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: `${prompt}${retryInstruction}` },
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

      finalImageBase64 = extractGeneratedImageBase64(response);
      if (!finalImageBase64) {
        continue;
      }

      if (type !== 'RING') {
        break;
      }

      const placementCheck = await verifyRingFingerPlacement(ai, finalImageBase64, normalizedFinger);
      if (placementCheck.correct) {
        break;
      }

      observedFinger = placementCheck.observedFinger;
    }

    if (finalImageBase64) {
      return res.json({
        image: `data:image/png;base64,${finalImageBase64}`
      });
    }

    throw new Error('No image generated by AI');
  } catch (error) {
    console.error('Error in generate-try-on-image:', error);
    res.status(500).json({ error: error.message || 'Failed to generate try-on image' });
  }
});

/**
 * POST /api/try-on
 * NEW UNIFIED PIPELINE: Gemini Direct Try-On with Server-Side Watermarking
 * - Supports guest users (watermarked results)
 * - Supports authenticated users (can unlock later)
 * - Optimizes images, processes with Gemini, returns watermarked result
 */
app.post('/api/try-on', guestRateLimiter, optionalAuth, async (req, res) => {
  try {
    const { baseImage, accessoryImage, accessoryType, finger, ringSize } = req.body;
    
    // Validation
    if (!baseImage || !accessoryImage) {
      return res.status(400).json({ error: 'baseImage and accessoryImage are required' });
    }

    console.log(`Try-on request: ${accessoryType || 'AUTO'} | Auth: ${req.isAuthenticated} | User: ${req.userId || 'guest'}`);

    // Step 1: Validate images
    const [baseValidation, accessoryValidation] = await Promise.all([
      imageProcessingService.validateImage(baseImage),
      imageProcessingService.validateImage(accessoryImage)
    ]);

    if (!baseValidation.valid) {
      return res.status(400).json({ error: `Base image invalid: ${baseValidation.reason}` });
    }

    if (!accessoryValidation.valid) {
      return res.status(400).json({ error: `Accessory image invalid: ${accessoryValidation.reason}` });
    }

    // Step 2: Detect accessory type if not provided
    let detectedType = accessoryType;
    if (!detectedType) {
      console.log('Detecting accessory type...');
      detectedType = await geminiAIService.detectAccessoryType(accessoryImage);
      console.log(`Detected: ${detectedType}`);
    }

    // Step 3: Generate clean try-on image using Gemini
    const tryOnResult = await geminiAIService.generateTryOnImage(
      baseImage,
      accessoryImage,
      {
        accessoryType: detectedType,
        finger: finger || 'RING',
        ringSize: ringSize
      }
    );

    const { cleanBuffer, cleanBase64 } = tryOnResult;

    // Step 4: Determine if user needs watermark
    const needsWatermark = !req.isAuthenticated || !req.userId;
    
    let responseImage;
    let requestId = null;

    if (needsWatermark) {
      // Guest user or not authenticated: Apply watermark
      console.log('Applying watermark for guest/free user...');
      const watermarked = await imageProcessingService.applyWatermark(cleanBuffer, {
        pattern: 'diagonal',
        text: 'JewelryFit',
        opacity: 0.25
      });

      // Store clean version temporarily for potential purchase
      requestId = cacheService.storeCleanImage(cleanBuffer, {
        userId: req.userId || 'guest',
        accessoryType: detectedType,
        timestamp: Date.now()
      });

      responseImage = `data:image/jpeg;base64,${watermarked.base64}`;
    } else {
      // Authenticated user: Still return watermarked but cache clean for unlock
      console.log('Applying watermark but caching clean version for authenticated user...');
      const watermarked = await imageProcessingService.applyWatermark(cleanBuffer, {
        pattern: 'diagonal',
        text: 'JewelryFit - Preview',
        opacity: 0.2
      });

      requestId = cacheService.storeCleanImage(cleanBuffer, {
        userId: req.userId,
        accessoryType: detectedType,
        timestamp: Date.now()
      });

      responseImage = `data:image/jpeg;base64,${watermarked.base64}`;
    }

    res.json({
      image: responseImage,
      accessoryType: detectedType,
      requestId, // Return for unlock later
      watermarked: true,
      message: req.isAuthenticated 
        ? 'Preview ready. Use requestId to unlock clean version.'
        : 'Preview ready. Log in to remove watermark.'
    });

  } catch (error) {
    console.error('Error in /api/try-on:', error);
    res.status(500).json({ error: error.message || 'Try-on failed' });
  }
});

/**
 * POST /api/unlock-image
 * Unlock a clean image (requires authentication and payment/credits)
 */
app.post('/api/unlock-image', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }

    console.log(`Unlock request: ${requestId} | User: ${req.userId}`);

    // Check if request exists
    const cached = cacheService.retrieveCleanImage(requestId);
    
    if (!cached) {
      return res.status(404).json({ 
        error: 'Image not found or expired. Please generate a new try-on.' 
      });
    }

    // Verify ownership (optional - can allow any authenticated user)
    if (cached.metadata.userId !== req.userId && cached.metadata.userId !== 'guest') {
      return res.status(403).json({ error: 'Unauthorized access to this image' });
    }

    // Check user credits (1 credit per unlock)
    const hasCredits = dbService.deductCredits(req.userId, 1);
    
    if (!hasCredits) {
      // Restore the image to cache since payment failed
      const restoredRequestId = cacheService.storeCleanImage(cached.buffer, cached.metadata);
      
      return res.status(402).json({ 
        error: 'Insufficient credits',
        requestId: restoredRequestId // Allow them to try again
      });
    }

    // Success: Return clean image
    const newCredits = dbService.getUserCredits(req.userId);
    const cleanBase64 = cached.buffer.toString('base64');

    console.log(`Unlocked successfully. Remaining credits: ${newCredits}`);

    res.json({
      image: `data:image/jpeg;base64,${cleanBase64}`,
      credits: newCredits,
      message: 'Image unlocked successfully'
    });

  } catch (error) {
    console.error('Error in /api/unlock-image:', error);
    res.status(500).json({ error: error.message || 'Unlock failed' });
  }
});

/**
 * GET /api/cache/stats
 * Get cache statistics (admin/debug endpoint)
 */
app.get('/api/cache/stats', authenticateToken, (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
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
