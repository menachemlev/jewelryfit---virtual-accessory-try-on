# 🚀 JewelryFit AI - Vercel Deployment Guide

## ⚠️ Important Notes

**Vercel Serverless Limitations:**
- **Execution time**: 300 seconds max (Hobby: 10s, Pro: 60s, Enterprise: 300s)
- **Memory**: 3008 MB max
- **No persistent storage**: Files are ephemeral
- **Cold starts**: First request may be slow

**Recommendation:** For production AI workloads (SAM, Imagen 3), use:
- Google Cloud Run (recommended)
- AWS Lambda with EFS
- Azure Container Instances
- Dedicated server

This Vercel deployment provides:
- ✅ Frontend React app
- ✅ JavaScript API endpoints
- ✅ Lighting analysis (Gemini - lightweight)
- ❌ Full pipeline (too heavy for serverless)

---

## 📦 What's Deployed on Vercel

### Frontend
- React/TypeScript app (App.tsx)
- All UI components
- Static assets

### API Routes (JavaScript)
- `/api/health.js` - Health check
- `/api/analyze-fit.js` - Fit analysis
- `/api/detect-accessory-type.js` - Jewelry detection
- `/api/detect-ring-size.js` - Ring sizing
- `/api/generate-try-on-image.js` - Try-on generation
- `/api/validate-image-suitability.js` - Image validation
- `/api/users/*` - User management

### Lightweight Python Functions
- `/api/python/lighting_analysis.py` - Gemini lighting analysis only

---

## 🚀 Deploy to Vercel

### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Production deploy
vercel --prod
```

### Method 2: GitHub Integration

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Configure environment variables (see below)
6. Deploy

---

## 🔑 Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

### Required
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Optional (for full features)
```
VERTEX_PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
```

---

## 🏗️ Architecture for Production

### Hybrid Approach (Recommended)

```
┌─────────────────────────────────────────────────────┐
│                    Vercel                           │
│  ┌──────────────────────────────────────────────┐  │
│  │  Frontend (React)                            │  │
│  │  - UI Components                             │  │
│  │  - Image uploads                             │  │
│  │  - Results display                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  JavaScript API Routes                       │  │
│  │  - User management                           │  │
│  │  - Basic operations                          │  │
│  │  - Lightweight tasks                         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        │ API Calls
                        ▼
┌─────────────────────────────────────────────────────┐
│           External Backend (Cloud Run)              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Python AI Pipeline                          │  │
│  │  - Gemini 1.5 Flash (lighting)               │  │
│  │  - SAM (masking)                             │  │
│  │  - Imagen 3 (inpainting)                     │  │
│  │  - Full processing power                     │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Setup External Backend

```bash
# Deploy Python pipeline to Cloud Run
gcloud run deploy jewelryfit-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --timeout 300

# Get backend URL
gcloud run services describe jewelryfit-backend \
  --region us-central1 \
  --format 'value(status.url)'

# Add to Vercel environment variables
BACKEND_API_URL=https://jewelryfit-backend-xxx.run.app
```

---

## 📝 Update Frontend to Use External Backend

```typescript
// services/apiService.ts

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://your-backend.run.app';

export async function processTryOn(userImage: File, watchImage: File) {
  // Upload to backend
  const formData = new FormData();
  formData.append('user_image', userImage);
  formData.append('watch_image', watchImage);
  
  const response = await fetch(`${BACKEND_URL}/api/try-on`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}
```

---

## 🔧 Files to Keep for Vercel

### Essential Files
- ✅ `vercel.json` - Vercel configuration
- ✅ `package.json` - Dependencies
- ✅ `App.tsx` - Frontend
- ✅ `components/*` - UI components
- ✅ `api/*.js` - JavaScript APIs
- ✅ `api/python/lighting_analysis.py` - Lightweight Python function

### Files to Remove (Not Needed on Vercel)
- ❌ `Dockerfile` - Vercel doesn't use Docker
- ❌ `docker-compose.yml` - Not needed
- ❌ `api_server.py` - Use Cloud Run instead
- ❌ `test_pipeline.py` - Development only
- ❌ `api_client_example.py` - Example code

---

## 🧹 Cleanup Commands

```bash
# Remove Docker files
rm Dockerfile docker-compose.yml

# Remove standalone API server (use Cloud Run)
# Keep jewelry_tryon_pipeline.py for external deployment
rm api_server.py api_client_example.py test_pipeline.py

# Remove duplicate documentation
# Keep only: README.md, VERCEL_DEPLOYMENT.md, DEPLOYMENT_GUIDE.md
```

---

## 🎯 Deployment Checklist

- [ ] Set environment variables in Vercel
- [ ] Deploy Python backend to Cloud Run
- [ ] Update `BACKEND_API_URL` in frontend
- [ ] Test lighting analysis endpoint
- [ ] Test full try-on with external backend
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring/analytics

---

## 💰 Cost Estimates

### Vercel Costs
- **Hobby**: Free (10GB bandwidth, 100GB-hours)
- **Pro**: $20/month (unlimited bandwidth)

### External Backend (Cloud Run)
- **Compute**: ~$0.01 per try-on request
- **AI APIs**: ~$0.04 per try-on (Imagen 3)
- **Total**: ~$0.05 per try-on

### Monthly Costs (1,000 users, 5 tries/month)
- Vercel: $0-20
- Backend (5,000 requests): $250
- **Total**: $250-270/month

---

## 🐛 Troubleshooting

### Issue: "Function Execution Timeout"
**Solution**: Move heavy processing to external backend

### Issue: "Module not found" for Python
**Solution**: Ensure `api/python/requirements.txt` exists

### Issue: "Cold start too slow"
**Solution**: Use Cloud Run with min-instances=1

### Issue: "CORS errors"
**Solution**: Check Access-Control-Allow-Origin headers

---

## 📊 Monitoring

### Vercel Dashboard
- View function logs
- Monitor bandwidth usage
- Check deployment status

### Cloud Run (External Backend)
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Monitor costs
gcloud billing accounts list
```

---

## 🔒 Security

### API Key Protection
```javascript
// Never expose in frontend
// Use environment variables
const apiKey = process.env.GEMINI_API_KEY; // Server-side only
```

### Rate Limiting
```javascript
// Implement in API routes
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
});
```

---

## ✅ Summary

**What's on Vercel:**
- Frontend React app ✅
- JavaScript API routes ✅
- Lightweight Python functions ✅

**What's on Cloud Run:**
- Full AI pipeline ✅
- Heavy processing ✅
- SAM + Imagen 3 ✅

**Benefits:**
- Fast global CDN (Vercel)
- Scalable AI processing (Cloud Run)
- Cost-effective
- Easy deployment

---

**Deploy frontend to Vercel, backend to Cloud Run for best results!** 🚀
