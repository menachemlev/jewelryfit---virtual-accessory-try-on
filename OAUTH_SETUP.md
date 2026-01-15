# Real OAuth Login Setup Guide

This application now supports real OAuth login with Google, Facebook, and Apple. Follow these steps to set up the authentication.

## Prerequisites

- A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
- Google, Facebook, and Apple developer accounts

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter your project name (e.g., "JewelryFit")
4. Follow the setup wizard
5. Once created, go to **Project Settings** (gear icon)
6. Copy your Firebase configuration values

## Step 2: Enable Authentication Providers

### Google Sign-In
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click **Google**
3. Enable it and set a project support email
4. Save

### Facebook Sign-In
1. In **Sign-in method**, click **Facebook**
2. Enable it
3. You'll need a Facebook App ID and App Secret from [Facebook Developers](https://developers.facebook.com/)
4. Paste them in Firebase and save

### Apple Sign-In
1. In **Sign-in method**, click **Apple**
2. Enable it
3. Follow Apple's setup instructions (may require additional configuration)
4. Save

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local` (create it if it doesn't exist):
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
   VITE_FIREBASE_APP_ID=your_firebase_app_id_here
   ```

3. Keep your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

## Step 4: Set up Authorized Domains

1. In Firebase **Authentication** > **Settings** (gear icon)
2. Add your domain(s) under "Authorized domains":
   - `localhost:5173` (for local development with Vite)
   - Your production domain

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Run the Application

```bash
npm run dev
```

## Troubleshooting

### "Firebase is not properly configured" error
- Check that all environment variables are set correctly
- Verify the `.env.local` file exists and is in the root directory
- Restart the development server after changing env variables

### "CORS error" or popup blocked
- Ensure your domain is added to Firebase's authorized domains
- Check browser popup settings (allow popups for localhost)
- Clear browser cache and cookies

### Google/Facebook login not working
- Verify the provider is enabled in Firebase Authentication
- Check that your app's domain is authorized in the provider's console
- For Facebook: ensure your Facebook App is in development or live mode

### Apple Sign-In issues
- Apple has stricter requirements
- Your domain must use HTTPS (except localhost)
- Follow Apple's specific setup in Firebase documentation

## Implementation Details

- **Authentication Service**: `services/authService.ts` handles OAuth with Firebase
- **Login Screen**: `components/LoginScreen.tsx` provides UI for login
- **App Integration**: `App.tsx` manages auth state and routing
- **Storage**: User data is cached in localStorage via `storageService`

## Security Notes

- Never commit `.env.local` to version control
- Keep your Firebase API key secret (can be rotated in Firebase Console)
- Firebase authentication is secure and handles token management automatically
- User data is only stored locally; your backend is not exposed to the app

## Production Deployment

1. Update authorized domains in Firebase
2. Set up your production domain's SSL certificate (HTTPS required)
3. Update `.env.production` with production Firebase credentials
4. Deploy and test thoroughly
