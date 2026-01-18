# Deployment Instructions for JewelryFit AI

## 🚀 Vercel Deployment (Current)

This app is optimized for Vercel deployment with a hybrid architecture:

### Quick Deploy
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Set environment variables in Vercel Dashboard:
#    GEMINI_API_KEY=your_key
```

### What's Deployed on Vercel
- ✅ React/TypeScript frontend
- ✅ JavaScript API routes
- ✅ Lightweight Python functions (lighting analysis)

### Full AI Pipeline (Optional)
For complete watch try-on with SAM + Imagen 3, deploy `jewelry_tryon_pipeline.py` to:
- Google Cloud Run (recommended)
- AWS Lambda
- Azure Functions

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed instructions.

---

## 📚 Documentation

- **[VERCEL_QUICKSTART.md](VERCEL_QUICKSTART.md)** - Quick start guide
- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Complete deployment guide
- **[README.md](README.md)** - Project overview

---

## 🔑 Required Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Optional (for full pipeline):
```
NEXT_PUBLIC_BACKEND_API_URL=https://your-backend.run.app
VERTEX_PROJECT_ID=your_gcp_project_id
```

---

## 📦 Files Structure

```
jewelryfit-ai/
├── App.tsx                     # Frontend
├── components/                 # UI components
├── api/                        # Vercel serverless functions
│   ├── *.js                   # JavaScript APIs
│   └── python/                # Python functions
│       └── lighting_analysis.py
├── jewelry_tryon_pipeline.py  # Full AI pipeline (Cloud Run)
├── vercel.json                # Vercel config
└── package.json               # Dependencies
```

---

## 🎯 Architecture

```
Vercel (Frontend + APIs)
    │
    ├─► JavaScript APIs (fast operations)
    │
    ├─► Python/Gemini (lighting analysis)
    │
    └─► Cloud Run Backend (full AI pipeline)
         └─► SAM + Imagen 3 (heavy processing)
```

---

## ✅ Deployment Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set environment variables in Vercel
- [ ] Deploy: `vercel --prod`
- [ ] Test frontend at your Vercel URL
- [ ] (Optional) Deploy Python backend to Cloud Run
- [ ] (Optional) Update `NEXT_PUBLIC_BACKEND_API_URL`

---

**Ready to deploy!** Run `vercel --prod` 🚀
