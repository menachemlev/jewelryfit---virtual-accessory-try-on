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
          model: this.model,
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
    const basePrompt = `Act as a professional photo retoucher and jewelry specialist.

Your task: Seamlessly fuse the jewelry from the second image onto the appropriate location in the first image.

Requirements:
1. POSITIONING: Place the ${accessoryType.toLowerCase()} naturally and accurately on the ${this.getBodyPartName(accessoryType)}
2. LIGHTING: Match the lighting, shadows, and highlights exactly to the first image's environment
3. PERSPECTIVE: Adjust the jewelry's angle and perspective to match the body part's orientation
4. REALISM: Ensure the jewelry looks like it's actually being worn - add subtle shadows under/around it
5. SEAMLESS BLEND: No visible edges, perfect integration with skin tone and texture
6. QUALITY: Maintain high resolution and professional quality
`;

    // Add specific instructions based on accessory type
    let specificInstructions = '';
    
    if (accessoryType === 'RING' && details.finger) {
      specificInstructions = `\nSpecific details:
- Place the ring on the ${details.finger.toLowerCase()} finger
- Position it at the natural ring-wearing location (between first and second knuckle)
- Ensure the ring's size appears proportional${details.ringSize ? ` (target size: ${details.ringSize})` : ''}
- Account for finger curvature and perspective`;
    } else if (accessoryType === 'WATCH') {
      specificInstructions = `\nSpecific details:
- Position the watch on the wrist naturally, slightly above the wrist bone
- Ensure the watch face is clearly visible and properly oriented
- Make it appear as if the band wraps around the wrist
- Add subtle shadows beneath the watch and band`;
    } else if (accessoryType === 'BRACELET') {
      specificInstructions = `\nSpecific details:
- Position the bracelet naturally on the wrist
- Ensure it drapes or sits realistically based on the bracelet style
- Account for the wrist's curvature and natural pose
- Add appropriate shadows and highlights`;
    }

    return basePrompt + specificInstructions + `\n\nReturn ONLY the final composite image with the jewelry seamlessly integrated.`;
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
1. Size appropriateness (does it look natural and proportional?)
2. Position accuracy (is it placed correctly?)
3. Overall realism (does it look like a real photo?)

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
          model: 'gemini-1.5-flash',
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
