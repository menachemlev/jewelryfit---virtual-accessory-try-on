# Quick Start - Running the Secured Application

## First Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and add your Gemini API Key:**
   ```
   GEMINI_API_KEY=paste_your_key_here
   PORT=3001
   CLIENT_URL=http://localhost:5173
   VITE_API_URL=http://localhost:3001
   ```

## Running the Application

**Option 1: Run both server and client together (Recommended)**
```bash
npm run dev:all
```

**Option 2: Run separately**
- Terminal 1: `npm run server`
- Terminal 2: `npm run dev`

## What Changed

- ✅ API key is now **server-side only** (secure)
- ✅ All Gemini API calls go through backend (hidden)
- ✅ Client code makes HTTP requests to your server
- ✅ No sensitive data exposed to browser

## Access Points

- **Client App**: http://localhost:5173
- **Server API**: http://localhost:3001
- **Server Health Check**: http://localhost:3001/api/health

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot GET /" on port 3000 | Port changed to 5173. Visit http://localhost:5173 |
| Server won't start | Check if port 3001 is free, verify GEMINI_API_KEY in .env |
| Client can't reach server | Make sure server is running, check VITE_API_URL in .env |
| CORS errors | Verify CLIENT_URL matches your client origin |

## For Deployment

See `SERVER_SETUP.md` for production deployment instructions.
