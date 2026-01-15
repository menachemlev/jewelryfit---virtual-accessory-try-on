import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Replicate from 'replicate';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

app.post('/api/generate-ring', async (req, res) => {
  try {
    const { handImage, selectedFinger } = req.body;

    if (!handImage) {
      return res.status(400).json({ error: 'Missing handImage' });
    }

    const fingerName = selectedFinger ? selectedFinger.charAt(0).toUpperCase() + selectedFinger.slice(1) : 'Ring';

    const prompt = `
      I have a photo of a hand.
      
      Task: Create a highly realistic image showing a beautiful, high-quality ring worn on the ${fingerName || 'ring'} finger.
      
      Requirements:
      - Position the ring on the ${fingerName || 'ring'} finger naturally
      - The ring should wrap realistically around the finger curvature
      - Match the lighting and shadows to the hand photo
      - Generate realistic shadows cast by the ring onto the skin
      - Maintain high resolution and clarity of the ring details
      - The ring should look like it's actually being worn
      - Output ONLY the resulting image with the ring on the hand
    `;

    console.log(`Creating Flux prediction for ${fingerName}...`);

    // Clean base64 string if it contains metadata
    const cleanHand = handImage.replace(/^data:image\/[^;]+;base64,/, "");

    // Use Replicate SDK - it handles polling automatically
    const output = await replicate.run(
      "black-forest-labs/flux-dev",
      {
        input: {
          prompt: prompt,
          image: `data:image/jpeg;base64,${cleanHand}`,
          num_outputs: 1,
          output_format: 'jpg',
          output_quality: 90,
          guidance: 3.5,
          num_inference_steps: 30
        }
      }
    );

    console.log('Flux generation succeeded!');

    if (output && output.length > 0) {
      const imageUrl = output[0];
      
      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return res.json({ success: true, imageBase64: base64 });
    } else {
      throw new Error('No output generated from Flux');
    }
  } catch (error) {
    console.error('Flux API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
