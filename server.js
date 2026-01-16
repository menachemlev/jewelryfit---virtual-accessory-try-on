// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bodyParser from 'body-parser';

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const cleanBase64 = (base64String) => {
    return base64String.replace(/^data:image\/\w+;base64,/, "");
};

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

app.post('/api/try-on', async (req, res) => {
  try {
    const { baseImage, accessoryImage, type } = req.body;

    if (!baseImage || !accessoryImage || type !== 'RING') {
      return res.status(400).json({ error: "Currently supporting RING only." });
    }

    console.log("--- Starting Try-On Process (Focus: Ring Finger) ---");

    // --- שלב 1: ניתוח מדויק עם Gemini Vision ---
    console.log("1. Analyzing images...");
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // השינוי הגדול: הנחיות ספציפיות לקמיצה ולפרטי הטבעת
    const analysisPrompt = `
      You are an expert AI creating instructions for an image generator.
      
      INPUTS:
      - Image A: A hand.
      - Image B: A ring.

      TASK:
      Write a highly detailed prompt to place the ring from Image B onto the **RING FINGER** (the fourth finger) of the hand in Image A.

      INSTRUCTIONS:
      1. **Hand Analysis**: Describe the hand in Image A (skin tone, lighting direction, pose). Explicitly identify the position of the ring finger.
      2. **Product Analysis**: Describe the ring in Image B in extreme detail. Mention: material (gold/silver/etc), width (thick/thin), texture (polished/hammered/matte), stones (if any), and specific design quirks.
      
      OUTPUT FORMAT (Write ONLY this prompt):
      "A photorealistic close-up of [Hand Description], wearing a [Detailed Ring Description] specifically on the ring finger. The ring fits naturally at the base of the finger. The metal reflects the [Lighting Description] of the scene. High resolution, 8k, realistic skin texture."
    `;

    let fluxPrompt = "";
    try {
      const result = await visionModel.generateContent([
        analysisPrompt,
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64(baseImage) } },
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64(accessoryImage) } }
      ]);
      fluxPrompt = result.response.text();
      console.log("   Generated Prompt:", fluxPrompt);
    } catch (e) {
      console.error("   Gemini failed, using fallback.");
      fluxPrompt = "A photorealistic image of a hand wearing a silver ring on the ring finger, realistic lighting.";
    }

    // --- שלב 2: יצירה עם Flux Dev ---
    console.log("2. Generating with Flux...");

    const output = await replicate.run("black-forest-labs/flux-dev", {
      input: {
        // חיזוק ההוראה בפרומפט הסופי
        prompt: fluxPrompt + " The ring is strictly on the ring finger. Perfect fit, realistic shadow on skin, photographic quality.",
        image: baseImage, 
        
        // פרמטרים מכוילים לדיוק:
        go_fast: true,
        guidance_scale: 3.0, // העליתי קצת (מ-2.5 ל-3.0) כדי שיקשיב יותר להוראה "על הקמיצה"
        prompt_strength: 0.65, // שומר על היד המקורית (65% מקור, 35% שינוי)
        num_inference_steps: 28,
        output_format: "jpg"
      }
    });

    // --- שלב 3: החזרת התמונה ---
    let finalImageBase64 = "";
    const rawOutput = Array.isArray(output) ? output[0] : output;

    if (rawOutput && (typeof rawOutput.getReader === 'function' || rawOutput.readable)) {
      const imageBuffer = await streamToBuffer(rawOutput);
      finalImageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    } else if (typeof rawOutput === 'string') {
      const response = await fetch(rawOutput);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      finalImageBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }

    res.json({ imageUrl: finalImageBase64 });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});