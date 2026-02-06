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
    const basePrompt = `You are a master photorealistic image compositor specializing in jewelry photography. Your goal is to seamlessly place jewelry onto a body part so it appears IDENTICAL to a real photograph.

CORE TASK: Merge the jewelry from image 2 onto the body part in image 1, creating a single authentic photograph where the jewelry is genuinely worn.

ABSOLUTE REALISM REQUIREMENTS - Apply ALL of these:

1. SHADOWS ARE CRITICAL FOR REALISM:
   - Jewelry MUST cast accurate, soft-edged shadows onto the skin (direction matches light source)
   - Shadow intensity decreases with distance from contact point
   - Add ambient occlusion in tight spaces (under ring band, between links)
   - Include subtle self-shadowing on the jewelry itself
   - No harsh or artificial shadow edges

2. LIGHTING & REFLECTIONS:
   - Match exact lighting direction, intensity, and color temperature from the original photo
   - Metal surfaces must show realistic environment reflections (subtle skin tones, ambient light)
   - Gemstones should show light refraction and internal sparkle
   - Add subtle specular highlights where light hits metal edges
   - Ensure jewelry brightness matches the scene's exposure

3. PHYSICAL CONTACT & DEFORMATION:
   - Show realistic skin compression where jewelry touches (especially visible on rings)
   - Slight skin color change at pressure points (slight redness or whitening)
   - Natural wrinkles and skin folds around the jewelry
   - Jewelry should follow the exact 3D curvature of the body part
   - No floating or hovering - jewelry must appear to have weight and contact

4. PERSPECTIVE & SCALE:
   - Apply correct perspective distortion based on camera angle
   - Jewelry size must be anatomically proportional
   - Maintain consistent depth of field with the original photo
   - Foreground/background blur should match if present

5. EDGE BLENDING & INTEGRATION:
   - Seamless transitions between jewelry and skin - zero visible boundaries
   - Preserve skin texture continuity (pores, hair, wrinkles must flow naturally around jewelry)
   - Use micro-level anti-aliasing for perfect edge smoothness
   - Slight color bleeding from jewelry onto nearby skin (subtle reflection)

6. MATERIAL AUTHENTICITY:
   - Metal: Brushed/polished finish visible, micro-scratches if present, appropriate reflectivity
   - Gemstones: Facet reflections, depth, transparency variations, realistic brilliance
   - Surface imperfections make it real (tiny wear marks, fingerprints, dust)

7. COLOR & TONE MATCHING:
   - Perfectly match white balance between jewelry and photo
   - Jewelry colors adjusted to scene lighting conditions
   - No saturation mismatch - jewelry shouldn't look pasted or oversaturated
   - Subtle color cast from ambient light on jewelry

8. ATMOSPHERIC CONSISTENCY:
   - If photo has grain/noise, add matching grain to jewelry
   - Match sharpness levels (don't make jewelry sharper than the rest)
   - Compression artifacts should be consistent
   - Overall photo "feel" must be unified

9. ANATOMICAL ACCURACY:
   - Jewelry placement follows natural wearing position
   - Skin deforms realistically around tight jewelry
   - Natural gaps where jewelry is loose
   - Gravity affects draping/hanging correctly

10. PHOTOGRAPHIC IMPERFECTIONS (Makes it believable):
    - Slight motion blur if hand/body shows movement
    - Natural focus falloff if applicable
    - Realistic lighting inconsistencies (not overly perfect)
    - Subtle lens distortion matching the original photo
`;

    // Add specific instructions based on accessory type
    let specificInstructions = '';
    
    if (accessoryType === 'RING' && details.finger) {
      specificInstructions = `\n━━━ RING-SPECIFIC CRITICAL DETAILS ━━━
📍 PLACEMENT: Position on ${details.finger.toLowerCase()} finger at the base (between first and second knuckle for most rings)
📏 SIZE: Ring must look anatomically correct - not too loose or impossibly tight${details.ringSize ? ` (approx. size ${details.ringSize})` : ''}
🔄 CURVATURE: Ring MUST wrap completely around the finger's cylindrical shape - show the band curving around sides and back
📐 DEPTH & 3D: Ring sits 2-3mm above skin surface - show this elevation clearly
🌑 SHADOWS: Dark shadow directly under the band, softer shadow extending outward on finger
💪 SKIN INTERACTION: 
   - Slight bulging of skin above/below ring if snug
   - Subtle skin compression marks at contact points
   - Finger skin texture continues under transparent stones
   - Natural skin discoloration at pressure point
🔆 METAL BEHAVIOR: Inside band is slightly darker, outside catches more light
✨ STONE RENDERING: If present, gemstones refract light realistically, show finger skin through transparent stones`;
    } else if (accessoryType === 'WATCH') {
      specificInstructions = `\n━━━ WATCH-SPECIFIC CRITICAL DETAILS ━━━
📍 PLACEMENT: Natural position on wrist, case sits 2-3cm above wrist bone on top of forearm
🔄 BAND WRAPPING: Band must follow complete wrist circumference - show sides curving around
📐 DEPTH: Watch case is 8-12mm thick - this elevation must be visible
🌑 SHADOWS: 
   - Primary shadow under watch case onto wrist
   - Secondary shadows from band segments
   - Shadow trail following the band's path
💪 SKIN INTERACTION:
   - Band creates slight skin indentation/compression line
   - Wrist hair (if present) slightly pressed down under band
   - Skin may show slight redness where band is snug
🔆 WATCH FACE: Glass/crystal shows subtle reflections of environment, slight anti-glare coating
✨ METAL LINKS: Each link casts tiny shadow on the next, creating depth
📱 ORIENTATION: Watch face readable and properly aligned (12 o'clock points toward hand)`;
    } else if (accessoryType === 'BRACELET') {
      specificInstructions = `\n━━━ BRACELET-SPECIFIC CRITICAL DETAILS ━━━
📍 PLACEMENT: Natural position on wrist with realistic draping based on weight and flexibility
🔄 CURVATURE: Follow wrist's oval/cylindrical contour completely
📐 MOVEMENT: Show natural gaps between bracelet and skin if loose-fitting
🌑 SHADOWS:
   - Cast shadow on wrist surface
   - Internal shadows between links/beads
   - Shadow depth varies with bracelet thickness
💪 SKIN INTERACTION:
   - If snug: slight compression marks, skin gathering
   - If loose: visible gaps, bracelet may hang lower on gravity side
   - Wrist bones may create contact points
🔆 PHYSICS: Heavier bracelets hang lower, lighter ones sit higher
✨ MATERIAL DRAPING: Chain bracelets drape differently than solid bangles - show this behavior
🔗 LINK/BEAD DETAILS: Each component interacts with light individually, creating complex shadows`;
    }

    return basePrompt + specificInstructions + `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FINAL CRITICAL INSTRUCTION:
This must look EXACTLY like a professional photograph taken with a real camera of someone ACTUALLY wearing the jewelry.
❌ FORBIDDEN: Flat overlay, digital sticker look, CGI appearance, perfect/artificial lighting, missing shadows, floating jewelry
✅ REQUIRED: Imperfect but believable, natural lighting imperfections, realistic material behavior, proper depth and shadows

Return ONLY the final photorealistic composite image - no explanations, no other content.`;
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
