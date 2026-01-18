# 🔮 JewelryFit AI - Vercel Quick Start

## ✨ What This Deployment Includes

This is a **hybrid architecture** optimized for Vercel:

- **Frontend** (on Vercel): React/TypeScript UI
- **JavaScript APIs** (on Vercel): User management, lightweight operations
- **Python AI Pipeline** (deploy separately): Full watch try-on processing

---

## 🚀 Deploy to Vercel in 3 Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Set Environment Variables
Create `.env.local`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_BACKEND_API_URL=https://your-backend.run.app
```

### 3. Deploy
```bash
vercel --prod
```

That's it! Your frontend and lightweight APIs are live.

---

## ⚙️ Environment Variables (Vercel Dashboard)

Go to: **Project Settings → Environment Variables**

### Required
```
GEMINI_API_KEY=your_gemini_api_key
```

### Optional (for full features)
```
NEXT_PUBLIC_BACKEND_API_URL=https://your-cloud-run-url.run.app
VERTEX_PROJECT_ID=your_gcp_project
```

---

## 🔧 For Full AI Pipeline (Recommended)

Vercel serverless functions have limitations (10-60s timeout). For production-quality watch try-ons, deploy the Python backend separately:

### Quick Deploy to Google Cloud Run

```bash
# 1. Navigate to project
cd c:\projects\jewelryfit---virtual-accessory-try-on

# 2. Deploy (requires gcloud CLI)
gcloud run deploy jewelryfit-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --timeout 300 \
  --set-env-vars GEMINI_API_KEY=your_key

# 3. Get URL
gcloud run services describe jewelryfit-backend \
  --region us-central1 \
  --format 'value(status.url)'

# 4. Add URL to Vercel environment variables as:
# NEXT_PUBLIC_BACKEND_API_URL=<cloud-run-url>
```

---

## 📁 Project Structure (Vercel Optimized)

```
jewelryfit-ai/
├── App.tsx                          # React frontend
├── components/                      # UI components
├── services/                        # API services
├── api/                             # Vercel serverless functions
│   ├── *.js                        # JavaScript APIs (user, auth, etc)
│   └── python/                     # Lightweight Python functions
│       ├── lighting_analysis.py    # Gemini lighting analysis
│       └── requirements.txt        # Python dependencies
├── jewelry_tryon_pipeline.py       # Full AI pipeline (deploy to Cloud Run)
├── vercel.json                     # Vercel configuration
└── package.json                    # Node dependencies
```

---

## 🎯 API Endpoints

### On Vercel (Fast, Serverless)
- `GET /api/health` - Health check
- `POST /api/users/register` - User registration
- `POST /api/analyze-fit` - Basic fit analysis
- `POST /api/python/lighting_analysis` - Lighting analysis with Gemini

### On Cloud Run (Full AI Pipeline)
- `POST /api/try-on` - Complete watch try-on with SAM + Imagen 3

---

## 🧪 Test Your Deployment

### Test Frontend
```bash
# Visit your Vercel URL
https://your-app.vercel.app
```

### Test Lighting Analysis API
```bash
curl -X POST https://your-app.vercel.app/api/python/lighting_analysis \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,..."}'
```

### Test Full Pipeline (Cloud Run)
```bash
curl -X POST https://your-backend.run.app/api/try-on \
  -F "user_image=@test_arm.jpg" \
  -F "watch_image=@test_watch.jpg"
```

---

## 💰 Cost Estimate

### Vercel
- **Hobby**: Free (sufficient for development)
- **Pro**: $20/month (recommended for production)

### Cloud Run (Full AI Pipeline)
- **Per request**: ~$0.05 (includes Imagen 3)
- **1,000 users, 5 tries/month**: ~$250/month

**Total**: $20-270/month depending on usage

---

## 🔒 Security Checklist

- [ ] Set `GEMINI_API_KEY` as secret (not exposed to frontend)
- [ ] Enable CORS only for your domain
- [ ] Implement rate limiting in API routes
- [ ] Add authentication for premium features
- [ ] Use environment variables for all secrets

---

## 🐛 Common Issues

### "Function execution timeout"
**Solution**: Move heavy AI processing to Cloud Run

### "Module not found" in Python function
**Solution**: Check `api/python/requirements.txt` includes all deps

### CORS errors
**Solution**: Ensure API routes include CORS headers

### Cold starts
**Solution**: Use Cloud Run with `--min-instances=1`

---

## 📊 Monitoring

### Vercel Dashboard
- View real-time logs
- Monitor function invocations
- Track bandwidth usage

### Cloud Run Logs
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

---

## 🎓 Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Test JavaScript APIs
3. ✅ Deploy Python pipeline to Cloud Run
4. ✅ Connect frontend to backend
5. ✅ Add custom domain
6. ✅ Set up monitoring

---

## 📚 Documentation

- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Detailed deployment guide
- [README.md](README.md) - Main project documentation
- [jewelry_tryon_pipeline.py](jewelry_tryon_pipeline.py) - AI pipeline code

---

## 🚀 Deploy Now

```bash
# Clone repo
git clone <your-repo>

# Install dependencies
npm install

# Deploy to Vercel
vercel --prod

# Deploy backend to Cloud Run
gcloud run deploy jewelryfit-backend --source .
```

**You're ready to go!** 🎉

For questions or issues, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed troubleshooting.
