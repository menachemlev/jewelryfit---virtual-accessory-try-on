# Real OAuth Login - Quick Start Guide

## 📋 What Changed?

Your app now uses **real OAuth authentication** with Firebase instead of mock login. Users must authenticate with Google, Facebook, or Apple.

## 🚀 Quick Setup (5 minutes)

### 1. Create Firebase Project
Visit https://console.firebase.google.com/ and create a new project

### 2. Get Firebase Config
Project Settings → Copy your Firebase config values:
- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID

### 3. Create `.env.local` File
Create a file named `.env.local` in the project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_key
```

### 4. Enable OAuth Providers
In Firebase Console:
- Authentication → Sign-in method
- Enable: **Google**, **Facebook**, **Apple**

### 5. Add Authorized Domains
Authentication → Settings → Authorized domains:
- Add `localhost:5173` (for local development)

### 6. Run!
```bash
npm run dev
```

## 🔐 OAuth Providers Setup

### Google (Easiest)
- Enable in Firebase → Done! Google project is automatic

### Facebook
1. Go to https://developers.facebook.com/
2. Create an app
3. Get your App ID and App Secret
4. Paste them in Firebase Authentication settings

### Apple
1. Enable in Firebase
2. Follow Firebase's Apple setup guide
3. Requires Apple Developer account ($99/year)

## 🧪 Testing

1. Start dev server: `npm run dev`
2. You should see login buttons
3. Click any button and you'll see a Firebase popup
4. Login with your account
5. You're in! (data is stored locally)

## 📁 New/Modified Files

```
NEW FILES:
├── services/authService.ts          (OAuth logic)
├── .env.example                      (template)
├── .env.local.example               (quick reference)
├── OAUTH_SETUP.md                   (detailed guide)
└── IMPLEMENTATION_SUMMARY.md        (this file)

MODIFIED FILES:
├── App.tsx                          (uses real auth)
├── components/LoginScreen.tsx       (loading states)
├── services/storageService.ts       (setUser method)
└── package.json                     (Firebase dependency)
```

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "Firebase not configured" | Check `.env.local` file exists and is filled correctly |
| Popup doesn't open | Allow popups for localhost in browser |
| Login redirects away | Domain not in Firebase authorized domains |
| "User not found" | Normal - first time logging in creates new user |
| Persistent login loop | Clear localStorage: `localStorage.clear()` in console |

## 🔑 Environment Variables Explained

```
VITE_FIREBASE_API_KEY
  └─ Public Firebase API key (safe to expose)

VITE_FIREBASE_AUTH_DOMAIN
  └─ Your Firebase project domain (e.g., myapp.firebaseapp.com)

VITE_FIREBASE_PROJECT_ID
  └─ Unique identifier for your Firebase project

VITE_FIREBASE_STORAGE_BUCKET
  └─ Cloud storage bucket (not used in this app yet)

VITE_FIREBASE_MESSAGING_SENDER_ID
  └─ For push notifications (not used in this app)

VITE_FIREBASE_APP_ID
  └─ App registration ID with Firebase
```

## 🎯 User Flow

```
User Clicks Login Button
        ↓
Firebase Popup Opens
        ↓
User Authenticates (Google/FB/Apple)
        ↓
Firebase Returns User Data
        ↓
App Stores User & Shows Main Interface
        ↓
User Can Now Generate Try-Ons
        ↓
Click Logout → Clears Session
```

## 📚 Documentation

- **Full Setup**: Read [OAUTH_SETUP.md](OAUTH_SETUP.md)
- **Technical Details**: See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Firebase Docs**: https://firebase.google.com/docs/auth

## ✅ Checklist

- [ ] Firebase project created
- [ ] OAuth providers enabled
- [ ] `.env.local` created with Firebase config
- [ ] `localhost:5173` added to authorized domains
- [ ] `npm install` completed
- [ ] `npm run dev` runs without errors
- [ ] Login popup appears when clicking login
- [ ] Can login with Google/Facebook/Apple
- [ ] Main app shows after login
- [ ] Logout works and returns to login screen

## 💬 Need Help?

1. Check browser console (F12) for error messages
2. Verify all environment variables in `.env.local`
3. Confirm provider is enabled in Firebase
4. Check Firebase user list to see logged-in users
5. Read [OAUTH_SETUP.md](OAUTH_SETUP.md) for detailed troubleshooting

---

**Status**: ✅ Ready to Configure & Deploy
