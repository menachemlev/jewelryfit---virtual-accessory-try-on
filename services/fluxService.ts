export const generateRingWithFlux = async (
  handImageBase64: string,
  ringImageBase64: string,
  selectedFinger?: string
): Promise<string> => {
  try {
    // Call backend endpoint instead of Replicate directly to avoid CORS
    const response = await fetch('/api/generate-ring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        handImage: handImageBase64,
        ringImage: ringImageBase64,
        selectedFinger: selectedFinger
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Backend API error: ${error.error}`);
    }

    const data = await response.json();
    
    if (data.success && data.imageBase64) {
      return data.imageBase64;
    } else {
      throw new Error('Invalid response from backend');
    }
  } catch (error) {
    console.error('Flux API Error:', error);
    throw error;
  }
};

