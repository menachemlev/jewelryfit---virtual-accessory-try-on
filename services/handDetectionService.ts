import { Hands } from '@mediapipe/hands';
import { FingerType } from '../types';

export interface FingerLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface HandDetectionResult {
  detected: boolean;
  fingerPositions?: Record<FingerType, FingerLandmark[]>;
  markedImageBase64?: string;
  confidenceScore?: number;
  description?: string;
}

export interface CropInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  croppedImageBase64: string;
}

// Finger landmark indices for MediaPipe
const FINGER_INDICES: Record<FingerType, number[]> = {
  'thumb': [0, 2, 3, 4],
  'index': [5, 6, 7, 8],
  'middle': [9, 10, 11, 12],
  'ring': [13, 14, 15, 16],
  'pinky': [17, 18, 19, 20]
};

// Hand connections from MediaPipe
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20]
];

const drawLandmarksOnCanvas = (
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  canvasWidth: number,
  canvasHeight: number,
  color: string = '#FFD700',
  lineWidth: number = 3,
  radius: number = 3
) => {
  for (const connection of HAND_CONNECTIONS) {
    const start = landmarks[connection[0]];
    const end = landmarks[connection[1]];
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
    ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
    ctx.stroke();
  }
  
  for (const landmark of landmarks) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(landmark.x * canvasWidth, landmark.y * canvasHeight, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
};

const runHandDetection = (hands: Hands, canvas: HTMLCanvasElement): Promise<any | null> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('Hand detection timeout');
      resolve(null);
    }, 5000);

    let detected = false;
    hands.onResults((results: any) => {
      if (!detected) {
        detected = true;
        clearTimeout(timeout);
        resolve(results);
      }
    });

    hands.send({ image: canvas }).catch(err => {
      clearTimeout(timeout);
      console.error('Error sending image to MediaPipe:', err);
      resolve(null);
    });
  });
};

export const detectHandLandmarks = async (imageBase64: string): Promise<HandDetectionResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      let hands: Hands | null = null;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({ detected: false, description: 'Failed to create canvas context' });
          return;
        }

        ctx.drawImage(img, 0, 0);

        hands = new Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        // Run detection on full image
        let detectionResults = await runHandDetection(hands, canvas);

        if (!detectionResults?.multiHandLandmarks || detectionResults.multiHandLandmarks.length === 0) {
          if (hands) hands.close();
          resolve({ detected: false, description: 'No hand detected in full image' });
          return;
        }

        let landmarks = detectionResults.multiHandLandmarks[0];
        console.log('Initial detection successful, found', landmarks.length, 'landmarks');

        // Get bounding box of detected hand
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const lm of landmarks) {
          minX = Math.min(minX, lm.x);
          maxX = Math.max(maxX, lm.x);
          minY = Math.min(minY, lm.y);
          maxY = Math.max(maxY, lm.y);
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const handSize = width * height;

        console.log(`Hand bounding box: ${(minX * 100).toFixed(1)}%-${(maxX * 100).toFixed(1)}% x ${(minY * 100).toFixed(1)}%-${(maxY * 100).toFixed(1)}%, size: ${(handSize * 100).toFixed(1)}%`);

        // Only crop if hand is relatively small (less than 60% of image)
        if (handSize < 0.36) {
          console.log('Hand is small (' + (handSize * 100).toFixed(1) + '%), attempting to crop for better detection...');
          
          // Add padding (20% around the hand)
          const padding = 0.2;
          const paddedMinX = Math.max(0, minX - padding * width);
          const paddedMaxX = Math.min(1, maxX + padding * width);
          const paddedMinY = Math.max(0, minY - padding * height);
          const paddedMaxY = Math.min(1, maxY + padding * height);

          // Crop the image
          const cropWidth = img.width * (paddedMaxX - paddedMinX);
          const cropHeight = img.height * (paddedMaxY - paddedMinY);
          const cropX = img.width * paddedMinX;
          const cropY = img.height * paddedMinY;

          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropWidth;
          croppedCanvas.height = cropHeight;
          const croppedCtx = croppedCanvas.getContext('2d');

          if (croppedCtx) {
            croppedCtx.drawImage(
              img,
              cropX, cropY, cropWidth, cropHeight,
              0, 0, cropWidth, cropHeight
            );

            // Re-run hand detection on cropped image
            const croppedDetectionResults = await runHandDetection(hands, croppedCanvas);

            if (croppedDetectionResults?.multiHandLandmarks && croppedDetectionResults.multiHandLandmarks.length > 0) {
              // Scale landmarks back to original image coordinates
              const croppedLandmarks = croppedDetectionResults.multiHandLandmarks[0];
              landmarks = croppedLandmarks.map(lm => ({
                x: lm.x * (paddedMaxX - paddedMinX) + paddedMinX,
                y: lm.y * (paddedMaxY - paddedMinY) + paddedMinY,
                z: lm.z || 0,
                visibility: lm.visibility || 0
              }));
              console.log('Cropped detection successful, landmarks rescaled to original image space');
            } else {
              console.warn('Cropped detection failed, using original detection');
            }
          }
        }

        const fingerPositions: Record<FingerType, FingerLandmark[]> = {
          'thumb': [],
          'index': [],
          'middle': [],
          'ring': [],
          'pinky': []
        };

        // Extract finger positions
        for (const [finger, indices] of Object.entries(FINGER_INDICES)) {
          fingerPositions[finger as FingerType] = indices.map(i => ({
            x: landmarks[i].x,
            y: landmarks[i].y,
            z: landmarks[i].z || 0,
            visibility: landmarks[i].visibility || 0
          }));
        }

        // Create marked image with highlighted hand
        const markedCanvas = document.createElement('canvas');
        markedCanvas.width = img.width;
        markedCanvas.height = img.height;
        const markedCtx = markedCanvas.getContext('2d');

        if (markedCtx) {
          markedCtx.drawImage(img, 0, 0);
          drawLandmarksOnCanvas(markedCtx, landmarks, img.width, img.height, '#FFD700', 3, 4);
        }

        const markedImageBase64 = markedCanvas.toDataURL('image/jpeg').split(',')[1];

        // Calculate average confidence
        const avgConfidence = landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / landmarks.length;

        if (hands) hands.close();

        resolve({
          detected: true,
          fingerPositions,
          markedImageBase64,
          confidenceScore: avgConfidence,
          description: `Hand detected with ${avgConfidence.toFixed(2)} confidence`
        });

      } catch (error) {
        console.error('Hand detection error:', error);
        if (hands) {
          try { hands.close(); } catch (e) { /* ignore */ }
        }
        resolve({ detected: false, description: 'Error during hand detection: ' + String(error) });
      }
    };

    img.onerror = () => {
      resolve({ detected: false, description: 'Failed to load image' });
    };

    img.src = imageBase64;
  });
};

export const cropAroundFinger = async (
  imageBase64: string,
  fingerLandmarks: FingerLandmark[],
  imageWidth: number,
  imageHeight: number,
  padding: number = 0.3
): Promise<CropInfo | null> => {
  try {
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        // Get finger bounding box
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const lm of fingerLandmarks) {
          minX = Math.min(minX, lm.x);
          maxX = Math.max(maxX, lm.x);
          minY = Math.min(minY, lm.y);
          maxY = Math.max(maxY, lm.y);
        }

        const width = maxX - minX;
        const height = maxY - minY;

        // Add padding around finger
        const paddedMinX = Math.max(0, minX - padding * width);
        const paddedMaxX = Math.min(1, maxX + padding * width);
        const paddedMinY = Math.max(0, minY - padding * height);
        const paddedMaxY = Math.min(1, maxY + padding * height);

        // Calculate crop dimensions in pixels
        const cropX = paddedMinX * imageWidth;
        const cropY = paddedMinY * imageHeight;
        const cropWidth = (paddedMaxX - paddedMinX) * imageWidth;
        const cropHeight = (paddedMaxY - paddedMinY) * imageHeight;

        // Create cropped canvas
        const canvas = document.createElement('canvas');
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        const croppedImageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

        console.log(`Cropped finger region: ${cropWidth.toFixed(0)}x${cropHeight.toFixed(0)} at (${cropX.toFixed(0)}, ${cropY.toFixed(0)})`);

        resolve({
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight,
          croppedImageBase64
        });
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = imageBase64;
    });
  } catch (error) {
    console.error('Error cropping around finger:', error);
    return null;
  }
};

export const compositeImageOnOriginal = async (
  originalImageBase64: string,
  croppedResultBase64: string,
  cropInfo: CropInfo
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const originalImg = new Image();
    const resultImg = new Image();
    let imagesLoaded = 0;

    const checkComplete = () => {
      imagesLoaded++;
      if (imagesLoaded === 2) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = originalImg.width;
          canvas.height = originalImg.height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw original image
          ctx.drawImage(originalImg, 0, 0);

          // Draw result image on top at crop position
          ctx.drawImage(resultImg, cropInfo.x, cropInfo.y, cropInfo.width, cropInfo.height);

          const compositeBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
          console.log('Image composited back to original');
          resolve(compositeBase64);
        } catch (error) {
          reject(error);
        }
      }
    };

    originalImg.onload = checkComplete;
    originalImg.onerror = () => reject(new Error('Failed to load original image'));
    originalImg.src = originalImageBase64;

    resultImg.onload = checkComplete;
    resultImg.onerror = () => reject(new Error('Failed to load result image'));
    resultImg.src = `data:image/jpeg;base64,${croppedResultBase64}`;
  });
};

export const drawRectangleAroundFinger = async (
  imageBase64: string,
  fingerLandmarks: FingerLandmark[],
  imageWidth: number,
  imageHeight: number,
  padding: number = 0.15
): Promise<string | null> => {
  try {
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        // Get finger bounding box
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const lm of fingerLandmarks) {
          minX = Math.min(minX, lm.x);
          maxX = Math.max(maxX, lm.x);
          minY = Math.min(minY, lm.y);
          maxY = Math.max(maxY, lm.y);
        }

        const width = maxX - minX;
        const height = maxY - minY;

        // Add padding around finger
        const paddedMinX = Math.max(0, minX - padding * width);
        const paddedMaxX = Math.min(1, maxX + padding * width);
        const paddedMinY = Math.max(0, minY - padding * height);
        const paddedMaxY = Math.min(1, maxY + padding * height);

        // Calculate rectangle dimensions in pixels
        const rectX = paddedMinX * imageWidth;
        const rectY = paddedMinY * imageHeight;
        const rectWidth = (paddedMaxX - paddedMinX) * imageWidth;
        const rectHeight = (paddedMaxY - paddedMinY) * imageHeight;

        // Create canvas and draw rectangle
        const canvas = document.createElement('canvas');
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Draw red rectangle around finger
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

        const annotatedImageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
        console.log(`Drew red rectangle around finger: (${rectX.toFixed(0)}, ${rectY.toFixed(0)}) ${rectWidth.toFixed(0)}x${rectHeight.toFixed(0)}`);

        resolve(annotatedImageBase64);
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = imageBase64;
    });
  } catch (error) {
    console.error('Error drawing rectangle around finger:', error);
    return null;
  }
};
