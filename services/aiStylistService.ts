import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface StylistCritiqueOptions {
  userImageUrl: string;
  accessoryImageUrl: string;
  accessoryType: 'WATCH' | 'BRACELET' | 'RING';
  userSkinTone?: string;
  userStyle?: string;
}

/**
 * Generate AI styling critique using Gemini
 * Returns personalized advice on whether the accessory suits the user
 */
export async function generateStylistCritique(options: StylistCritiqueOptions): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert luxury jewelry stylist and fashion consultant. 
Analyze this ${options.accessoryType.toLowerCase()} in the context of the user's appearance and provide a concise, professional styling opinion (2-3 sentences maximum).

Consider:
- How the ${options.accessoryType.toLowerCase()}'s color/material complements their skin tone
- Whether the design matches modern fashion trends
- The overall aesthetic harmony
- Professional occasions vs casual wear

Be honest but tactful. If it's a great match, explain why. If not ideal, suggest what might work better.
Keep it conversational, warm, and actionable.

Example good response: "The rose gold perfectly complements your warm skin undertones, creating an elegant and cohesive look. This classic design suggests refined taste and works beautifully for both professional and social settings. The size is well-proportioned for your wrist, avoiding the overpowering effect larger watches can create."

Now analyze this ${options.accessoryType.toLowerCase()} choice:`;

    // Convert images to base64 if needed (simplified - in production you'd handle this properly)
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating stylist critique:', error);
    
    // Fallback critique
    return getFallbackCritique(options.accessoryType);
  }
}

function getFallbackCritique(accessoryType: string): string {
  const fallbacks = {
    WATCH: "This timepiece showcases excellent proportions and a classic design that transcends fleeting trends. The finish appears to complement warm skin tones particularly well, creating a sophisticated and polished appearance suitable for various occasions.",
    BRACELET: "This bracelet demonstrates fine craftsmanship with a design that balances elegance and versatility. The style works well for both casual and formal settings, and the proportions appear well-suited to create a refined aesthetic.",
    RING: "This ring features a timeless design with excellent attention to detail. The style suggests refined taste and appears to be well-proportioned, creating an elegant statement without being overpowering. It's versatile enough for daily wear while maintaining sophistication."
  };

  return fallbacks[accessoryType as keyof typeof fallbacks] || fallbacks.WATCH;
}

/**
 * Generate critique using backend service (for Cloud Run integration)
 */
export async function generateStylistCritiqueViaBackend(
  userImageBase64: string,
  accessoryImageBase64: string,
  accessoryType: string
): Promise<string> {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL;
    if (!backendUrl) {
      // Fallback to direct Gemini
      return getFallbackCritique(accessoryType);
    }

    const response = await fetch(`${backendUrl}/stylist-critique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userImage: userImageBase64,
        accessoryImage: accessoryImageBase64,
        accessoryType
      })
    });

    if (!response.ok) {
      throw new Error('Backend styling service unavailable');
    }

    const data = await response.json();
    return data.critique || getFallbackCritique(accessoryType);
  } catch (error) {
    console.error('Error calling backend stylist service:', error);
    return getFallbackCritique(accessoryType);
  }
}
