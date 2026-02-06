import { GoogleGenAI } from '@google/genai';
import imageProcessingService from './imageProcessingService.js';

/**
 * Gemini AI Service
 * Handles all Google Gemini AI interactions for jewelry try-on
 */
class GeminiAIService {
  constructor() {
    this.client = null;
    this.model = 'gemini-1.5-pro'; // Vision model
  }

  /**
   * Initialize Gemini client
   * @private
   */
  getClient() {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing in environment variables');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Retry helper with exponential backoff
   * @private
   */
  async callWithRetry(fn, retries = 3, delay = 1000) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = 
        error.status === 429 || 
        error.code === 429 || 
        (error.message && (
          error.message.includes('429') || 
          error.message.includes('Quota exceeded') || 
          error.message.includes('RESOURCE_EXHAUSTED')
        ));

      if (retries > 0 && isRateLimit) {
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Generate jewelry try-on image
   * Fuses jewelry onto body part with professional retouching
   * 
   * @param {string} bodyImage - Base64 body part image (wrist, hand, etc.)
   * @param {string} jewelryImage - Base64 jewelry image
   * @param {object} options - Additional options
   * @returns {Promise<{cleanBuffer: Buffer, cleanBase64: string}>}
   */
  async generateTryOnImage(bodyImage, jewelryImage, options = {}) {
    try {
      const {
        accessoryType = 'WATCH',
        finger = null,
        ringSize = null
      } = options;

      // Optimize both images
      console.log('Optimizing images for AI processing...');
      const [optimizedBody, optimizedJewelry] = await Promise.all([
        imageProcessingService.optimizeImageForAI(bodyImage),
        imageProcessingService.optimizeImageForAI(jewelryImage)
      ]);

      // Build context-aware prompt
      const prompt = this.buildTryOnPrompt(accessoryType, { finger, ringSize });

      console.log('Sending to Gemini AI for fusion...');
      const ai = this.getClient();

      const response = await this.callWithRetry(() => 
        ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: {
            parts: [
              { 
                inlineData: { 
                  mimeType: optimizedBody.mimeType, 
                  data: optimizedBody.base64 
                } 
              },
              { 
                inlineData: { 
                  mimeType: optimizedJewelry.mimeType, 
                  data: optimizedJewelry.base64 
                } 
              },
              { text: prompt }
            ]
          }
        })
      );

      // Extract result
      const result = response.candidates?.[0]?.content?.parts?.[0];
      
      if (!result || !result.inlineData) {
        throw new Error('AI did not return a valid image result');
      }

      const cleanBase64 = result.inlineData.data;
      const cleanBuffer = Buffer.from(cleanBase64, 'base64');

      console.log('AI fusion completed successfully');
      
      return {
        cleanBuffer,
        cleanBase64,
        mimeType: result.inlineData.mimeType || 'image/jpeg'
      };
    } catch (error) {
      console.error('Error in generateTryOnImage:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  /**
   * Build context-aware prompt for try-on generation
   * @private
   */
  buildTryOnPrompt(accessoryType, details) {
    const basePrompt = `Act as an expert photorealistic compositor and jewelry photographer.

Your task: Create a photorealistic composite where the jewelry from the second image appears to be physically worn on the body part in the first image.

CRITICAL - Achieve Maximum Realism:
1. NATURAL INTEGRATION: The jewelry must look three-dimensional and physically present, NOT flat or overlaid
2. DEPTH & SHADOWS: Add realistic shadows cast BY the jewelry onto the skin, and subtle shadows ON the jewelry from surrounding light sources
3. LIGHTING COHERENCE: Match ALL lighting characteristics - direction, color temperature, intensity, and reflections from the first image
4. PERSPECTIVE & DISTORTION: Apply natural perspective distortion based on the body part's angle and camera position
5. SURFACE INTERACTION: Show natural contact points between jewelry and skin - slight compression, skin texture changes, subtle indentations
6. MATERIAL PHYSICS: Ensure metal reflects light naturally, gemstones refract light appropriately, and all materials behave realistically
7. SEAMLESS EDGES: Blend edges perfectly with anti-aliasing, soft transitions, and natural skin texture continuation
8. COLOR HARMONY: Adjust jewelry colors to match the color grading and white balance of the original photo
9. MICRO-DETAILS: Preserve skin pores, fine lines, and texture around and underneath the jewelry
10. PHOTO-QUALITY: The result must be indistinguishable from a professional photograph taken with the jewelry actually worn
`;

    // Add specific instructions based on accessory type
    let specificInstructions = '';
    
    if (accessoryType === 'RING' && details.finger) {
      specificInstructions = `\nRing-Specific Requirements:
- Position: Natural ring location on the ${details.finger.toLowerCase()} finger (between first and second knuckle)
- Proportions: Ring size must look anatomically correct${details.ringSize ? ` (approximate size: ${details.ringSize})` : ''}
- Curvature: Follow the natural cylindrical curve of the finger - the ring should wrap around completely
- Depth: Show the ring's thickness and how it sits slightly above the skin surface
- Shadows: Cast ring shadow onto finger, show shadowing inside the band
- Interaction: Slight skin pressure marks where band contacts finger, natural skin gathering if ring is snug`;
    } else if (accessoryType === 'WATCH') {
      specificInstructions = `\nWatch-Specific Requirements:
- Position: Natural placement on wrist, slightly above the wrist bone
- Orientation: Watch face properly aligned and clearly visible
- Band Integration: Band must curve and wrap realistically around the entire wrist circumference
- Depth & Shadows: Watch case casts shadow on wrist, band creates subtle shadow trail
- Skin Contact: Show how the band sits on wrist - slight skin compression, realistic strap tension
- Reflections: Watch crystal/glass reflects ambient light naturally`;
    } else if (accessoryType === 'BRACELET') {
      specificInstructions = `\nBracelet-Specific Requirements:
- Position: Natural placement on wrist with realistic draping based on bracelet weight and style
- Curvature: Follow the wrist's natural cylindrical contour completely
- Movement: If the bracelet is loose, show natural gaps between bracelet and skin
- Depth: Show bracelet thickness and how it sits in relation to the skin surface
- Shadows: Cast shadows on wrist, show internal shadowing in links or gaps
- Physics: Respect gravity and natural hang of the bracelet material`;
    }

    return basePrompt + specificInstructions + `\n\nIMPORTANT: The final result must look like a single photograph taken with a real camera where the person is actually wearing the jewelry. NO flat overlay effects, NO digital sticker appearance. Every detail must contribute to photorealistic authenticity.\n\nReturn ONLY the final photorealistic composite image.`;
  }

  /**
   * Get body part name for prompt context
   * @private
   */
  getBodyPartName(accessoryType) {
    const mapping = {
      'WATCH': 'wrist',
      'BRACELET': 'wrist',
      'RING': 'finger',
      'NECKLACE': 'neck',
      'EARRING': 'ear'
    };
    return mapping[accessoryType] || 'appropriate body part';
  }

  /**
   * Detect accessory type from image
   * @param {string} image - Base64 image
   * @returns {Promise<string>} - WATCH, BRACELET, or RING
   */
  async detectAccessoryType(image) {
    try {
      const optimized = await imageProcessingService.optimizeImageForAI(image);
      const ai = this.getClient();

      const response = await this.callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-1.5-flash', // Use faster model for detection
          contents: {
            parts: [
              { inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } },
              { 
                text: "Classify the single accessory in this image as exactly one of these three types: 'WATCH', 'BRACELET', or 'RING'. Return only the word, nothing else." 
              }
            ]
          }
        })
      );

      const result = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
      
      // Validate result
      if (['WATCH', 'BRACELET', 'RING'].includes(result)) {
        return result;
      }

      // Default to BRACELET if unclear
      console.warn('AI returned unclear accessory type:', result);
      return 'BRACELET';
    } catch (error) {
      console.error('Error detecting accessory type:', error);
      throw new Error(`Accessory detection failed: ${error.message}`);
    }
  }

  /**
   * Analyze fit quality of generated try-on
   * @param {string} resultImage - Base64 result image
   * @param {string} accessoryType - Type of accessory
   * @returns {Promise<object>} - Fit analysis with score and recommendations
   */
  async analyzeFit(resultImage, accessoryType) {
    try {
      const optimized = await imageProcessingService.optimizeImageForAI(resultImage);
      const ai = this.getClient();

      const prompt = `Analyze this jewelry try-on image and provide fit assessment.

Accessory Type: ${accessoryType}

Evaluate:
1. Size appropriateness (is the jewelry proportional to the body part?)
2. Position accuracy (is it correctly placed on the body part?)
3. Overall quality (does the integration look natural and believable?)

Provide constructive feedback focused on sizing, positioning, and fit. Do NOT comment on rendering techniques or image composition methods.

Respond in JSON format:
{
  "score": <number 1-10>,
  "sizeAppropriate": <boolean>,
  "positionAccurate": <boolean>,
  "realistic": <boolean>,
  "recommendation": "<brief recommendation if score < 7>"
}`;

      const response = await this.callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } },
              { text: prompt }
            ]
          }
        })
      );

      const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Parse JSON response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return {
        score: 7,
        sizeAppropriate: true,
        positionAccurate: true,
        realistic: true,
        recommendation: null
      };
    } catch (error) {
      console.error('Error analyzing fit:', error);
      // Return neutral analysis on error
      return {
        score: 7,
        sizeAppropriate: true,
        positionAccurate: true,
        realistic: true,
        recommendation: null
      };
    }
  }

  /**
   * Detect ring size from hand image (experimental)
   * @param {string} handImage - Base64 hand image
   * @param {string} finger - Target finger
   * @returns {Promise<string>} - Estimated ring size
   */
  async detectRingSize(handImage, finger) {
    try {
      const optimized = await imageProcessingService.optimizeImageForAI(handImage);
      const ai = this.getClient();

      const response = await this.callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: {
            parts: [
              { inlineData: { mimeType: optimized.mimeType, data: optimized.base64 } },
              { 
                text: `Estimate the ring size for the ${finger} finger in this hand image. Consider finger width and proportions. Respond with a US ring size (e.g., "5", "6.5", "8"). Return only the size number.` 
              }
            ]
          }
        })
      );

      const result = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      // Validate and sanitize result
      const sizeMatch = result.match(/\d+(\.\d+)?/);
      if (sizeMatch) {
        return sizeMatch[0];
      }

      return '7'; // Default average size
    } catch (error) {
      console.error('Error detecting ring size:', error);
      return '7'; // Default on error
    }
  }
}

// Export singleton instance
export default new GeminiAIService();
