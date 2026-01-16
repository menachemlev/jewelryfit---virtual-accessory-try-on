<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xrfK054GsJiEA6qlMCsAW-kZcWVFGwp4

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication for all API endpoints
- 💎 **Credit System** - SQLite database for persistent credit storage
- 🎨 **Virtual Try-On** - AI-powered jewelry try-on with Gemini
- 🔥 **Firebase Auth** - Google and Email authentication
- 💳 **PayPal Integration** - Purchase credits with PayPal

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   PORT=3001
   CLIENT_URL=http://localhost:5173
   VITE_API_URL=http://localhost:3001
   ```

3. Run the backend server:
   ```bash
   npm run server
   ```

4. In a new terminal, run the frontend:
   ```bash
   npm run dev
   ```

## Documentation

- [JWT Authentication Setup](JWT_AUTH_DOCUMENTATION.md) - Complete guide to token-based authentication
- [Database Setup](DATABASE_SETUP.md) - SQLite credit system documentation
- [Quick Start Guide](QUICK_START.md) - Get started quickly
