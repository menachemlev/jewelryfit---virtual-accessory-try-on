# Quick Start Guide - Gemini Pipeline

## Prerequisites
- Node.js 16+ installed
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Firebase project for Google Auth (optional for testing)

## 1. Install Dependencies

```bash
npm install
```

**New dependencies installed:**
- `sharp` - High-performance image processing
- `express-rate-limit` - API rate limiting
- `@google/generative-ai` - Already installed

## 2. Environment Setup

Create or update `.env`:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secure_random_string_here

# Optional
PORT=3001
CLIENT_URL=http://localhost:5173
```

## 3. Start the Server

```bash
# Server only
npm run server

# Or server + frontend together
npm run dev:all
```

## 4. Test the Pipeline

### Guest Try-On (No Auth)
```bash
curl -X POST http://localhost:3001/api/try-on \
  -H "Content-Type: application/json" \
  -d '{
    "baseImage": "data:image/jpeg;base64,...",
    "accessoryImage": "data:image/jpeg;base64,..."
  }'
```

Response:
```json
{
  "image": "data:image/jpeg;base64,... (watermarked)",
  "accessoryType": "RING",
  "requestId": "abc123...",
  "watermarked": true,
  "message": "Preview ready. Log in to remove watermark."
}
```

### Authenticated Unlock
```bash
curl -X POST http://localhost:3001/api/unlock-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "requestId": "abc123..."
  }'
```

Response:
```json
{
  "image": "data:image/jpeg;base64,... (clean!)",
  "credits": 9,
  "message": "Image unlocked successfully"
}
```

## 5. Key Endpoints

| Endpoint | Auth | Rate Limit | Purpose |
|----------|------|------------|---------|
| `POST /api/try-on` | Optional | 10/min (guest)<br>50/min (auth) | Generate watermarked preview |
| `POST /api/unlock-image` | Required | 50/min | Unlock clean image (1 credit) |
| `POST /api/users/register` | None | - | Register with Google OAuth |
| `GET /api/users/:userId/credits` | Required | - | Check credit balance |
| `POST /api/users/:userId/credits/add` | Required | - | Add credits |
| `GET /api/cache/stats` | Required | - | Cache statistics |

## 6. Frontend Integration

### Update App.tsx to remove email/password props

The `LoginScreen` component now only needs:
```typescript
<LoginScreen
  onLoginGoogle={handleGoogleLogin}
  lang={lang}
  setLang={setLang}
/>
```

Remove these props (no longer needed):
- `onLoginEmail`
- `onRegisterEmail`

### Use the new try-on endpoint

```typescript
const response = await fetch(`${API_URL}/api/try-on`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Optional: include auth token for higher rate limit
    ...(token && { 'Authorization': `Bearer ${token}` })
  },
  body: JSON.stringify({
    baseImage,
    accessoryImage,
    accessoryType: 'RING', // or omit for auto-detection
    finger: selectedFinger
  })
});

const { image, requestId, accessoryType } = await response.json();
// image is watermarked preview
// save requestId for unlock later
```

## 7. Services Overview

### Image Processing (`services/imageProcessingService.js`)
```javascript
import imageProcessingService from './services/imageProcessingService.js';

// Optimize for AI
const optimized = await imageProcessingService.optimizeImageForAI(base64Image);

// Add watermark
const watermarked = await imageProcessingService.applyWatermark(buffer, {
  pattern: 'diagonal',
  text: 'JewelryFit',
  opacity: 0.25
});

// Validate image
const validation = await imageProcessingService.validateImage(base64Image);
```

### Gemini AI (`services/geminiAIService.js`)
```javascript
import geminiAIService from './services/geminiAIService.js';

// Generate try-on
const result = await geminiAIService.generateTryOnImage(
  bodyImage,
  jewelryImage,
  { accessoryType: 'RING', finger: 'RING' }
);

// Detect accessory type
const type = await geminiAIService.detectAccessoryType(jewelryImage);

// Analyze fit
const analysis = await geminiAIService.analyzeFit(resultImage, 'RING');
```

### Cache (`services/cacheService.js`)
```javascript
import cacheService from './services/cacheService.js';

// Store clean image
const requestId = cacheService.storeCleanImage(buffer, metadata);

// Retrieve (one-time use)
const cached = cacheService.retrieveCleanImage(requestId);

// Check if exists
const exists = cacheService.exists(requestId);

// Get stats
const stats = cacheService.getStats();
```

## 8. Testing Watermarks

Three watermark patterns available:

### Diagonal (Default)
```javascript
await imageProcessingService.applyWatermark(buffer, {
  pattern: 'diagonal',
  text: 'JewelryFit',
  opacity: 0.25
});
```

### Center
```javascript
await imageProcessingService.applyWatermark(buffer, {
  pattern: 'center',
  text: 'PREVIEW',
  opacity: 0.3
});
```

### Grid
```javascript
await imageProcessingService.applyWatermark(buffer, {
  pattern: 'grid',
  text: 'JF',
  opacity: 0.2
});
```

## 9. Monitoring

### Check cache status
```bash
curl http://localhost:3001/api/cache/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Watch server logs
The server logs all major operations:
- Request flows
- Cache operations
- AI processing
- Authentication events
- Errors with stack traces

## 10. Troubleshooting

### "GEMINI_API_KEY is missing"
Add `GEMINI_API_KEY` to your `.env` file

### "Image optimization failed"
- Check image format (JPEG, PNG, WebP supported)
- Verify image isn't corrupted
- Ensure image size is reasonable (<10MB)

### "Rate limit exceeded"
- Wait 1 minute
- Or authenticate for higher limits (50/min)

### "Insufficient credits"
```bash
# Add credits (requires auth)
curl -X POST http://localhost:3001/api/users/USER_ID/credits/add \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10}'
```

### "Image not found or expired"
- Request ID is only valid for 30 minutes
- Generate a new try-on

## 11. Production Checklist

- [ ] Set strong `JWT_SECRET` in production
- [ ] Configure CORS for your domain
- [ ] Set up Redis for cache (optional but recommended)
- [ ] Enable S3 for long-term image storage (optional)
- [ ] Configure monitoring/logging (e.g., Sentry)
- [ ] Set up payment integration (PayPal/Stripe)
- [ ] Enable HTTPS
- [ ] Set appropriate rate limits for your scale
- [ ] Add IP whitelist for admin endpoints
- [ ] Configure database backups

## 12. Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ Upload Images
       ↓
┌─────────────────────────────────────────┐
│         Express Server (Node.js)         │
├─────────────────────────────────────────┤
│  Rate Limiter (10/min guest, 50/min auth)│
├─────────────────────────────────────────┤
│              /api/try-on                 │
│         ┌────────────────┐               │
│         │ Image Validate │               │
│         └────────┬───────┘               │
│                  ↓                       │
│         ┌────────────────┐               │
│         │  Sharp Optimize│               │
│         └────────┬───────┘               │
│                  ↓                       │
│         ┌────────────────┐               │
│         │  Gemini Fusion │               │
│         └────────┬───────┘               │
│                  ↓                       │
│         ┌────────────────┐               │
│         │   Watermark    │               │
│         └────────┬───────┘               │
│                  ↓                       │
│         ┌────────────────┐               │
│         │ Cache Clean    │────────┐      │
│         └────────┬───────┘        │      │
│                  ↓                 ↓      │
│         Return Watermarked    ┌────────┐ │
│                               │ Cache  │ │
│                               │Service │ │
│                               └────┬───┘ │
│          /api/unlock-image         │     │
│         ┌────────────────┐         │     │
│         │ Authenticate   │         │     │
│         └────────┬───────┘         │     │
│                  ↓                 │     │
│         ┌────────────────┐         │     │
│         │ Deduct Credits │         │     │
│         └────────┬───────┘         │     │
│                  ↓                 │     │
│         ┌────────────────┐         │     │
│         │ Retrieve Clean │←────────┘     │
│         └────────┬───────┘               │
│                  ↓                       │
│         Return Clean Image              │
└─────────────────────────────────────────┘
```

## 13. Quick Reference

### Service Methods

**imageProcessingService:**
- `optimizeImageForAI(input)` → {buffer, base64, mimeType}
- `applyWatermark(input, options)` → {buffer, base64}
- `validateImage(input)` → {valid, reason?}
- `getMetadata(input)` → metadata object
- `convertFormat(buffer, format)` → Buffer

**geminiAIService:**
- `generateTryOnImage(body, jewelry, options)` → {cleanBuffer, cleanBase64}
- `detectAccessoryType(image)` → 'WATCH' | 'BRACELET' | 'RING'
- `analyzeFit(image, type)` → {score, sizeAppropriate, positionAccurate, realistic}
- `detectRingSize(hand, finger)` → size string

**cacheService:**
- `storeCleanImage(buffer, metadata)` → requestId
- `retrieveCleanImage(requestId)` → {buffer, metadata} | null
- `exists(requestId)` → boolean
- `getMetadata(requestId)` → metadata | null
- `getStats()` → {total, active, expired, memoryUsage}
- `clear()` → void
- `remove(requestId)` → boolean

## Done! 🎉

Your server is now running with:
- ✅ Gemini AI integration
- ✅ Server-side watermarking
- ✅ Rate limiting
- ✅ Google-only auth
- ✅ Credit system
- ✅ Caching layer
- ✅ Improved UI

For detailed documentation, see `GEMINI_PIPELINE_DOCUMENTATION.md`
