# Business Logic & Pricing Implementation Guide

## 📋 Overview
This document outlines the complete business logic, pricing strategy, and UX flow implemented for JewelryFit AI.

## 🎯 Business Strategy

### Free Tier (Teaser)
- **Allowance:** First 2 images FREE
- **Limitation:** Heavy watermark overlay
- **Purpose:** Prove technology without giving away value
- **Implementation:** Watermark includes diagonal text, center lock badge, and corner markers

### Pricing Tiers (ILS)

| Tier | Price | Credits | Use Case | Cost/Image |
|------|-------|---------|----------|------------|
| **Single Unlock** | 5 ₪ | 1 | One-time removal | 5.00 ₪ |
| **Starter** ⭐ | 10 ₪ | 3 | Try multiple styles | 3.33 ₪ |
| **Pro** | 20 ₪ | 10 | Enthusiasts | 2.00 ₪ |
| **Business** | 50 ₪ | 50 | Vendors/Stores | 1.00 ₪ |

## 🔄 UX Flow (Lazy Registration)

### 1. Guest Mode (Default)
```
User lands → No login required → Immediate upload
```

### 2. Free Trial Process
```
Upload Photo → Process → Show Watermarked Result
↓
User sees heavy watermark + locked AI Stylist
↓
Click "Unlock" or "Remove Watermark"
↓
Login Modal Appears (Google Only)
```

### 3. Post-Login Flow
```
Login with Google → Choose Pricing Tier → Payment
↓
Watermark Removed + AI Stylist Unlocked
↓
Credits added to account
```

## 🎨 Key Features

### 1. Watermark Overlay
**File:** `components/WatermarkOverlay.tsx`

Features:
- Diagonal repeating text
- Center lock badge with "WATERMARKED" label
- Corner watermarks (4 positions)
- Semi-transparent overlay
- Non-removable via screenshot

### 2. AI Stylist (Curiosity Gap)
**File:** `components/AIStyleCritique.tsx`

**Locked State:**
- Blurred preview text
- Lock icon 🔒
- Call-to-action: "Remove watermark to reveal"
- Unlock button

**Unlocked State:**
- Full styling critique from Gemini AI
- Professional analysis of color match, skin tone, style
- 2-3 sentences of actionable advice
- "Premium Analysis Unlocked" badge

**Backend:** `services/aiStylistService.ts`
- Uses Gemini 1.5 Flash
- Generates personalized styling advice
- Analyzes skin tone compatibility
- Provides fashion trend insights

### 3. Pricing Modal
**File:** `components/PricingModal.tsx`

Features:
- 4 pricing tiers with visual hierarchy
- "Most Popular" badge on Starter tier
- Real-time credits display
- Per-image cost calculator
- "Continue with watermark" option
- Responsive grid layout

### 4. Lazy Authentication
**File:** `components/LoginScreen.tsx`

Changes:
- **Google Login ONLY** (no email/password)
- Modal mode support (`showCloseButton` prop)
- Simplified UI (removed register/login tabs)
- Privacy notice
- Single-click authentication

## 🔧 Technical Implementation

### Storage Service Updates
**File:** `services/storageService.ts`

New Methods:
```typescript
isGuestMode(): boolean
canUseFreeTrials(): boolean
incrementFreeTries(): Promise<void>
getFreeTriesRemaining(): number
```

### Type Definitions
**File:** `types.ts`

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'email';
  credits: number;
  freeTriesUsed: number; // NEW
  isPremium: boolean; // NEW
}

interface PricingTier {
  id: string;
  name: string;
  price: number; // ILS
  credits: number;
  description: string;
  popular?: boolean;
}

interface AIStyleCritique {
  text: string;
  isUnlocked: boolean;
}
```

## 🚀 Implementation in App.tsx

### State Management
```typescript
const [showPricingModal, setShowPricingModal] = useState(false);
const [showLoginModal, setShowLoginModal] = useState(false);
const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);
const [stylistCritique, setStylistCritique] = useState<string>('');
const [critiqueUnlocked, setCritiqueUnlocked] = useState(false);
```

### Try-On Processing Flow
```typescript
// 1. Check free trials
if (!user && storageService.canUseFreeTrials()) {
  // Process with watermark
  await storageService.incrementFreeTries();
  setShowWatermark(true);
}

// 2. Check credits (logged in users)
if (user && user.credits > 0) {
  // Process without watermark
  await storageService.deductCredit(1);
  setShowWatermark(false);
  setCritiqueUnlocked(true);
}

// 3. Prompt for payment
else {
  setShowPricingModal(true);
}
```

### Unlock Flow
```typescript
const handleUnlockImage = (historyItemId: string) => {
  if (!user) {
    // Trigger login
    setPendingUnlock(historyItemId);
    setShowLoginModal(true);
  } else {
    // Show pricing
    setShowPricingModal(true);
  }
};
```

## 💳 Payment Integration

### Payment Flow
1. User selects tier in PricingModal
2. Calls `paymentService.createOrder(tier)`
3. Opens PayPal/Stripe checkout
4. On success: Credits added via `storageService.addCredits()`
5. Database updated with new credit balance

### Backend Endpoints Required
```
POST /api/users/:userId/credits/add
POST /api/users/:userId/credits/deduct
POST /api/users/:userId/free-tries
```

## 🎯 User Journey Examples

### Example 1: Guest User
```
1. Lands on site (no login)
2. Uploads watch photo
3. Sees watermarked result + locked AI stylist
4. Clicks "Remove Watermark"
5. Signs in with Google
6. Selects "Starter" tier (10 ₪)
7. Pays via PayPal
8. Watermark removed, AI stylist unlocked
9. 2 credits remaining
```

### Example 2: Returning User with Credits
```
1. Already logged in (3 credits)
2. Uploads bracelet photo
3. Processes instantly (no watermark)
4. AI stylist shows full critique
5. 2 credits remaining
```

### Example 3: Vendor (Business Tier)
```
1. Buys Business tier (50 ₪ = 50 credits)
2. Uploads multiple product images
3. All results clean (no watermark)
4. Full AI analysis for each
5. Tracks usage: 43/50 credits remaining
```

## 📊 Tracking & Analytics

### Recommended Events
- `free_trial_used` (1/2)
- `watermark_displayed`
- `unlock_button_clicked`
- `login_triggered`
- `tier_selected` (single/starter/pro/business)
- `payment_completed`
- `ai_stylist_viewed`

### Conversion Funnel
```
Landing → Upload → Watermarked Result → Unlock Click → 
Login → Pricing → Payment → Premium Use
```

## 🔐 Security Considerations

1. **Watermark Protection**
   - Multiple layers (diagonal + center + corners)
   - Non-trivial to remove via editing
   - Serves as proof of tech without giving value

2. **Credit Management**
   - Server-side validation
   - JWT authentication required
   - Prevent client-side manipulation

3. **Free Trial Limits**
   - Guest: localStorage tracking
   - Logged-in: Database tracking
   - IP-based limiting (optional future enhancement)

## 🎨 UI/UX Highlights

### Visual Hierarchy
1. **Primary CTA:** Google Login button
2. **Secondary:** Pricing tier selection
3. **Tertiary:** "Continue with watermark" option

### Friction Reduction
- No email/password forms
- Single-click Google auth
- Clear value proposition
- Transparent pricing
- Visual proof (watermarked preview)

### Trust Signals
- "2 free images" prominent display
- Clean, professional watermark
- AI-powered badge
- Privacy policy notice

## 🚦 Testing Checklist

- [ ] Guest can use 2 free watermarked images
- [ ] 3rd attempt shows pricing modal
- [ ] Login modal appears when clicking unlock
- [ ] Google authentication works
- [ ] Pricing tiers display correctly
- [ ] Payment completes successfully
- [ ] Credits added to account
- [ ] Watermark removed after payment
- [ ] AI Stylist unlocks with payment
- [ ] Credits deduct properly
- [ ] Free trial counter persists (localStorage)
- [ ] Logged-in user free trials tracked in DB

## 📝 Future Enhancements

1. **Subscription Model**
   - Monthly unlimited (99 ₪/mo)
   - Annual discount (999 ₪/yr)

2. **Referral Program**
   - Give 1 credit, Get 1 credit
   - Viral growth loop

3. **Enterprise API**
   - Bulk processing
   - API key management
   - Webhook callbacks

4. **Social Proof**
   - "1,234 images created today"
   - Testimonials from vendors
   - Before/after gallery

## 🎯 Success Metrics

### Key KPIs
- **Free Trial → Paid conversion rate:** Target 15-25%
- **Average tier selected:** Target "Starter" or higher
- **Repeat purchase rate:** Target 40%+
- **Time to first payment:** Target < 5 minutes

### Revenue Projections
- **100 users/day:** 15 conversions × 15 ₪ avg = 225 ₪/day = ~6,750 ₪/mo
- **1,000 users/day:** 150 conversions × 15 ₪ avg = 2,250 ₪/day = ~67,500 ₪/mo

---

**Implementation Status:** ✅ Complete
**Last Updated:** January 2026
