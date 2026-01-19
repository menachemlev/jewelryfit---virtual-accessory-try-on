# JewelryFit - Gemini Direct Pipeline Implementation

## Overview
This document describes the complete implementation of the Gemini Direct pipeline with server-side watermarking, rate limiting, and Google-only authentication.

## Architecture

### 1. Core Services

#### Image Processing Service (`services/imageProcessingService.js`)
High-performance image preprocessing and watermarking using Sharp:

- **`optimizeImageForAI(input)`**: Resizes images to max 1080p, converts to WebP
- **`applyWatermark(input, options)`**: Adds semi-transparent watermark patterns
- **`validateImage(input)`**: Validates image suitability
- **`getMetadata(input)`**: Extracts image metadata
- **`convertFormat(buffer, format)`**: Converts between formats

**Watermark Patterns:**
- `diagonal`: Repeating diagonal text pattern (default)
- `center`: Large centered watermark
- `grid`: Grid pattern overlay

#### Gemini AI Service (`services/geminiAIService.js`)
Google Gemini integration for jewelry try-on:

- **`generateTryOnImage(bodyImage, jewelryImage, options)`**: Main fusion pipeline
- **`detectAccessoryType(image)`**: Auto-detects WATCH, BRACELET, or RING
- **`analyzeFit(resultImage, accessoryType)`**: Quality assessment (1-10 score)
- **`detectRingSize(handImage, finger)`**: Experimental ring size detection

**Features:**
- Automatic retry with exponential backoff for rate limits
- Context-aware prompts based on accessory type
- Professional retouching instructions

#### Cache Service (`services/cacheService.js`)
In-memory cache for clean images with TTL:

- **`storeCleanImage(buffer, metadata)`**: Store with 30-minute TTL
- **`retrieveCleanImage(requestId)`**: One-time retrieval (auto-removes)
- **`exists(requestId)`**: Check validity
- **`extendTTL(requestId, time)`**: Extend expiration
- **Automatic cleanup**: Every 5 minutes

### 2. API Endpoints

#### POST `/api/try-on` (Guest & Authenticated)
**The Unified Pipeline**

```typescript
Request Body:
{
  baseImage: string,        // Base64 body part image
  accessoryImage: string,   // Base64 jewelry image
  accessoryType?: string,   // WATCH, BRACELET, RING (auto-detected if omitted)
  finger?: string,          // For rings: THUMB, INDEX, MIDDLE, RING, PINKY
  ringSize?: string         // Optional ring size hint
}

Response:
{
  image: string,           // Base64 watermarked preview
  accessoryType: string,   // Detected or provided type
  requestId: string,       // For unlocking later
  watermarked: boolean,    // Always true
  message: string          // Status message
}
```

**Flow:**
1. Validates both images
2. Auto-detects accessory type if not provided
3. Optimizes images (Sharp → 1080p → WebP)
4. Processes with Gemini (fusion + retouching)
5. Applies watermark
6. Caches clean version (30 min TTL)
7. Returns watermarked preview + requestId

**Rate Limiting:**
- Guests: 10 req/min per IP
- Authenticated: 50 req/min

#### POST `/api/unlock-image` (Authenticated Only)
**Monetization Endpoint**

```typescript
Request Body:
{
  requestId: string  // From try-on response
}

Response:
{
  image: string,     // Base64 clean image
  credits: number,   // Remaining credits
  message: string
}
```

**Flow:**
1. Verifies authentication
2. Retrieves clean image from cache
3. Checks ownership (optional)
4. Deducts 1 credit
5. Returns clean image
6. Removes from cache (one-time use)

**Error Codes:**
- `404`: Image not found/expired
- `402`: Insufficient credits (returns restored requestId)
- `403`: Unauthorized ownership

#### GET `/api/cache/stats` (Authenticated)
Cache statistics for monitoring:

```json
{
  "total": 15,
  "active": 12,
  "expired": 3,
  "memoryUsage": "45.23 MB"
}
```

### 3. Rate Limiting

**Implementation:** `express-rate-limit`

**Guest Tier (No Auth):**
- Window: 1 minute
- Max: 10 requests
- Based on: IP address
- Skipped for: Authenticated requests

**Authenticated Tier:**
- Window: 1 minute
- Max: 50 requests
- Applied to: All authenticated endpoints

### 4. Authentication

**Google-Only Login** (Simplified)

**Removed:**
- Email/password authentication
- Registration forms
- Password reset flows
- Email verification

**Kept:**
- Google OAuth via Firebase
- JWT token generation
- Lazy registration (auto-create on first login)

**LoginScreen Updates:**
- Single Google button
- Cleaner UI with gradient background
- Enhanced visual feedback
- Security badge

### 5. UI Improvements

#### FingerSelector Component
**Upgraded SVG Hand Design:**
- Anatomically accurate finger shapes
- Realistic palm with gradients
- Visible knuckles and joints
- Fingernail highlights
- Palm lines for depth
- 3D-like shading with gradients
- Smooth hover transitions
- Better proportions (thumb, pinky sizing)

**Features:**
- Interactive finger selection
- Dual input (SVG + button grid)
- Responsive design
- Dark mode support
- Accessibility friendly

## Security Features

### Server-Side Watermarking
**Critical Security Layer:**
- Clean images NEVER reach client until authorized
- All previews are watermarked by default
- Clean versions cached server-side only
- One-time use unlock (auto-removed after retrieval)
- TTL prevents indefinite storage

### Payment Protection
- Credits verified before unlock
- Atomic deduction (no double-spending)
- Failed payments restore image to cache
- JWT authentication required

### Rate Limiting
- Prevents API abuse
- IP-based for guests
- Token-based for authenticated
- Configurable limits

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here

# Optional
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Usage Examples

### Guest Try-On
```javascript
const response = await fetch('http://localhost:3001/api/try-on', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    baseImage: 'data:image/jpeg;base64,...',
    accessoryImage: 'data:image/jpeg;base64,...'
  })
});

const { image, requestId, accessoryType } = await response.json();
// image is watermarked preview
// requestId can be used to unlock later
```

### Authenticated Unlock
```javascript
const response = await fetch('http://localhost:3001/api/unlock-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({ requestId })
});

const { image, credits } = await response.json();
// image is clean, unwatermarked
// credits shows remaining balance
```

## Performance Considerations

### Image Optimization
- Sharp is highly optimized (native libvips)
- WebP format reduces bandwidth by ~30%
- 1080p max prevents excessive processing
- Parallel optimization for base + accessory

### Caching Strategy
- In-memory for speed (can upgrade to Redis)
- 30-minute TTL balances availability vs memory
- Automatic cleanup prevents leaks
- Statistics endpoint for monitoring

### Gemini API
- Automatic retry with backoff
- Rate limit detection
- Model selection based on complexity
- Batch operations where possible

## Future Enhancements

1. **Redis Integration**: Replace in-memory cache
2. **S3 Storage**: Longer-term clean image storage
3. **Payment Integration**: PayPal/Stripe for credits
4. **Webhook Support**: Post-process notifications
5. **Image History**: User gallery of generations
6. **Advanced Analytics**: Fit scoring, recommendations
7. **Bulk Processing**: Multiple try-ons at once
8. **A/B Testing**: Multiple watermark styles

## Monitoring

### Key Metrics
- Request rate (guests vs authenticated)
- Cache hit/miss ratio
- Average processing time
- Credit consumption rate
- Gemini API usage
- Error rates by endpoint

### Logging
All services include detailed console logging:
- Request flows
- Cache operations
- AI processing steps
- Authentication events
- Error traces

## Deployment Notes

### Vercel Serverless
- Services work in serverless environment
- Cache service uses in-memory (ephemeral)
- Consider Redis for production
- Environment variables via Vercel dashboard

### Traditional Server
- All features supported
- Persistent in-memory cache
- Better for high-volume scenarios
- Easier Redis/S3 integration

## Testing

```bash
# Install dependencies
npm install

# Start server
npm run server

# Start frontend
npm run dev

# Run both concurrently
npm run dev:all
```

## API Flow Diagram

```
Guest User Flow:
┌─────────────────────────────────────────────────────────────┐
│  1. Upload images → /api/try-on (no auth)                   │
│     ↓                                                        │
│  2. Image validation (Sharp)                                │
│     ↓                                                        │
│  3. Accessory type detection (Gemini)                       │
│     ↓                                                        │
│  4. Optimization (Sharp → 1080p → WebP)                     │
│     ↓                                                        │
│  5. AI Fusion (Gemini Pro)                                  │
│     ↓                                                        │
│  6. Server-side watermarking (Sharp)                        │
│     ↓                                                        │
│  7. Cache clean version (30 min TTL)                        │
│     ↓                                                        │
│  8. Return: watermarked preview + requestId                 │
└─────────────────────────────────────────────────────────────┘

Authenticated Unlock Flow:
┌─────────────────────────────────────────────────────────────┐
│  1. Click "Remove Watermark" with requestId                 │
│     ↓                                                        │
│  2. Verify JWT token                                        │
│     ↓                                                        │
│  3. Retrieve clean image from cache                         │
│     ↓                                                        │
│  4. Check & deduct credits (DB)                             │
│     ↓                                                        │
│  5. Return clean image                                       │
│     ↓                                                        │
│  6. Remove from cache (one-time use)                        │
└─────────────────────────────────────────────────────────────┘
```

## Credits System

**Default Credits:** 10 (new users)

**Cost:**
- Try-on preview: FREE (rate-limited)
- Unlock clean image: 1 credit

**Add Credits:**
```javascript
POST /api/users/:userId/credits/add
Authorization: Bearer {token}
Body: { amount: 10 }
```

## Conclusion

This implementation provides:
✅ Secure server-side watermarking
✅ Guest user support (lazy auth)
✅ Professional AI-powered try-on
✅ Scalable rate limiting
✅ Simplified Google-only auth
✅ Monetization-ready unlock system
✅ Production-grade error handling
✅ Comprehensive service architecture

The system is ready for deployment and can be extended with payment integration, Redis caching, and S3 storage as needed.
