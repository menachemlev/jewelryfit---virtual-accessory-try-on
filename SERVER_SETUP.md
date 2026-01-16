# Server Setup Guide

This project now uses a backend server to securely handle Gemini API calls. The API key and all sensitive payloads remain on the server and are never exposed to the client.

## Architecture Overview

- **Client (Vite + React)**: Runs on `http://localhost:5173`
- **Backend Server (Express)**: Runs on `http://localhost:3001`
- **API Communication**: Client sends requests to the server, server handles Gemini API calls securely

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for both the client and server.

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001
```

**Important**: Never commit the `.env` file. It's in `.gitignore` for security.

### 3. Run Both Client and Server

#### Option A: Run both simultaneously (recommended for development)

```bash
npm run dev:all
```

This starts:
- Express server on `http://localhost:3001`
- Vite dev server on `http://localhost:5173`

#### Option B: Run separately

Terminal 1 - Start the server:
```bash
npm run server
```

Terminal 2 - Start the client:
```bash
npm run dev
```

### 4. Verify Everything Works

1. Open `http://localhost:5173` in your browser
2. The app should load without errors
3. Check the browser console and server terminal for any issues

## Server Endpoints

All endpoints are POST requests to the backend:

### `/api/health`
Health check endpoint.

### `/api/detect-accessory-type`
Detects if the uploaded accessory is a WATCH, BRACELET, or RING.

**Request:**
```json
{
  "baseImage": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "accessoryType": "WATCH"
}
```

### `/api/validate-image-suitability`
Validates if the image is suitable for try-on.

**Request:**
```json
{
  "baseImage": "data:image/jpeg;base64,...",
  "type": "WATCH"
}
```

**Response:**
```json
{
  "suitable": true,
  "issue": null
}
```

### `/api/generate-try-on-image`
Generates the final try-on image.

**Request:**
```json
{
  "baseImage": "data:image/jpeg;base64,...",
  "accessoryImage": "data:image/jpeg;base64,...",
  "type": "WATCH",
  "finger": "RING"
}
```

**Response:**
```json
{
  "image": "data:image/png;base64,..."
}
```

## Security Benefits

✅ **API Key Protection**: Gemini API key is only stored on the server, never exposed to clients
✅ **Payload Security**: Image processing and AI prompts happen server-side
✅ **CORS Enabled**: Server validates requests from your client domain
✅ **Error Handling**: Sensitive error details are logged on server, generic messages sent to client

## Troubleshooting

### Server won't start
- Check if port 3001 is already in use: `netstat -ano | findstr :3001` (Windows)
- Check if `GEMINI_API_KEY` is set in `.env`

### Client can't reach server
- Verify server is running on `http://localhost:3001`
- Check `VITE_API_URL` in `.env` matches server address
- Check browser console for CORS errors

### API errors
- Check server terminal for detailed error messages
- Verify Gemini API key is valid
- Check rate limiting (Gemini API has quotas)

## Deployment

When deploying to production:

1. Update `CLIENT_URL` in `.env` to your client domain
2. Update `VITE_API_URL` in `.env` to your server domain
3. Ensure `GEMINI_API_KEY` is securely configured in production environment
4. Use HTTPS for all communications
5. Consider adding authentication/API key validation between client and server

## Reverting to Client-Side Gemini (Not Recommended)

If you need to go back to client-side Gemini API calls, the old code is available in git history. However, this exposes your API key to the public and is a security risk.
