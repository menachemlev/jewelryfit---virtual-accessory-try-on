# 🎨 Visual Architecture - Business Logic Flow

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         JEWELRYFIT AI                            │
│                    Virtual Try-On Platform                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        USER LANDS (GUEST)                        │
│                     ❌ No Login Required                         │
│                      🎯 Zero Friction                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UPLOAD & PROCESS IMAGES                       │
│                  ┌────────────┬────────────┐                    │
│                  │   Photo    │  Jewelry   │                    │
│                  │  (User)    │ (Product)  │                    │
│                  └────────────┴────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               🔍 CHECK FREE TRIAL STATUS                         │
│                                                                  │
│   storageService.canUseFreeTrials()                             │
│   ├─ Guest: localStorage (0-2)                                  │
│   └─ Logged: database (0-2)                                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         ┌──────────────────┐      ┌──────────────────┐
         │ HAS FREE TRIALS  │      │  NO FREE TRIALS  │
         │   (0-1 used)     │      │   (2/2 used)     │
         └──────────────────┘      └──────────────────┘
                    │                         │
                    ▼                         ▼
    ┌───────────────────────────┐  ┌───────────────────────────┐
    │  GENERATE WITH WATERMARK  │  │     CHECK CREDITS         │
    │                           │  │                           │
    │  ┌─────────────────────┐ │  │  user.credits > 0 ?       │
    │  │ WatermarkOverlay    │ │  └───────────────────────────┘
    │  │ - Diagonal marks    │ │              │
    │  │ - Center lock badge │ │    ┌─────────┴──────────┐
    │  │ - Corner markers    │ │    ▼                    ▼
    │  └─────────────────────┘ │  ┌────────┐      ┌─────────────┐
    │                           │  │  YES   │      │     NO      │
    │  ┌─────────────────────┐ │  └────────┘      └─────────────┘
    │  │ AI Stylist: LOCKED  │ │      │                   │
    │  │ - Blurred preview   │ │      ▼                   ▼
    │  │ - Lock icon 🔒      │ │  ┌──────────┐    ┌─────────────┐
    │  │ - "Unlock" button   │ │  │ GENERATE │    │   SHOW      │
    │  └─────────────────────┘ │  │  CLEAN   │    │  PRICING    │
    │                           │  │  IMAGE   │    │   MODAL     │
    │  incrementFreeTries()     │  └──────────┘    └─────────────┘
    └───────────────────────────┘        │
                    │                    │
                    ▼                    ▼
    ┌───────────────────────────────────────────────────────────┐
    │           USER SEES WATERMARKED RESULT                    │
    │                                                            │
    │   ┌─────────────────────────────────────────────────┐   │
    │   │  🖼️  Try-On Image with Heavy Watermark         │   │
    │   │                                                  │   │
    │   │  "JEWELRYFIT AI • UNLOCK TO REMOVE" (diagonal)  │   │
    │   │  🔒 WATERMARKED (center badge)                  │   │
    │   │  Corner markers: 4x positions                   │   │
    │   └─────────────────────────────────────────────────┘   │
    │                                                            │
    │   ┌─────────────────────────────────────────────────┐   │
    │   │  💡 AI Stylist Opinion (LOCKED)                 │   │
    │   │                                                  │   │
    │   │  [Blurred preview text]                         │   │
    │   │  🔒 Lock Icon                                   │   │
    │   │  "Want to know if this matches your style?"     │   │
    │   │  "Remove watermark to reveal"                   │   │
    │   │                                                  │   │
    │   │  [ 🔓 Unlock Analysis ]                         │   │
    │   └─────────────────────────────────────────────────┘   │
    └───────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ USER CLICKS "UNLOCK"   │
                    └────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         ┌──────────────────┐      ┌──────────────────┐
         │   NOT LOGGED IN  │      │   LOGGED IN      │
         └──────────────────┘      └──────────────────┘
                    │                         │
                    ▼                         ▼
    ┌───────────────────────────┐  ┌───────────────────────────┐
    │     LOGIN MODAL           │  │     PRICING MODAL         │
    │                           │  │                           │
    │  ┌─────────────────────┐ │  │  ┌─────────────────────┐ │
    │  │  Google Sign-In     │ │  │  │  4 Pricing Tiers    │ │
    │  │                     │ │  │  │                     │ │
    │  │  [G] Continue with  │ │  │  │  5₪  - 1 credit    │ │
    │  │      Google         │ │  │  │  10₪ - 3 credits ⭐│ │
    │  │                     │ │  │  │  20₪ - 10 credits  │ │
    │  │  One-click auth     │ │  │  │  50₪ - 50 credits  │ │
    │  │  No email/password  │ │  │  │                     │ │
    │  └─────────────────────┘ │  │  │  Current: 0 credits │ │
    │                           │  │  │                     │ │
    │  Privacy notice           │  │  │  [Select Plan]      │ │
    └───────────────────────────┘  │  └─────────────────────┘ │
                    │               │                           │
                    ▼               │  [Continue with watermark]│
         ┌──────────────────┐      └───────────────────────────┘
         │  LOGIN SUCCESS   │                    │
         └──────────────────┘                    │
                    │                             │
                    ▼                             │
    ┌───────────────────────────┐                │
    │     PRICING MODAL         │◄───────────────┘
    │                           │
    │  (Same as right branch)   │
    └───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────────┐
    │               USER SELECTS PRICING TIER                    │
    │                                                            │
    │   Single (5₪) → 1 credit → 5₪/image                       │
    │   Starter (10₪) → 3 credits → 3.33₪/image ⭐ Popular      │
    │   Pro (20₪) → 10 credits → 2₪/image                       │
    │   Business (50₪) → 50 credits → 1₪/image                  │
    └───────────────────────────────────────────────────────────┘
                                 │
                                 ▼
    ┌───────────────────────────────────────────────────────────┐
    │                    PAYMENT PROCESS                         │
    │                                                            │
    │   PayPal / Stripe Integration                             │
    │   ├─ Create order                                         │
    │   ├─ User completes payment                               │
    │   └─ Webhook: Payment confirmed                           │
    └───────────────────────────────────────────────────────────┘
                                 │
                                 ▼
    ┌───────────────────────────────────────────────────────────┐
    │                  CREDITS ADDED TO ACCOUNT                  │
    │                                                            │
    │   POST /api/users/:userId/credits/add                     │
    │   └─ Database: user.credits += tier.credits               │
    │                                                            │
    │   Local state updated                                     │
    │   └─ setUser({ ...user, credits: newCredits })           │
    └───────────────────────────────────────────────────────────┘
                                 │
                                 ▼
    ┌───────────────────────────────────────────────────────────┐
    │                  ✨ PREMIUM UNLOCKED ✨                    │
    │                                                            │
    │   ✅ Watermark Removed                                    │
    │   ├─ setShowWatermark(false)                             │
    │   └─ Clean image displayed                               │
    │                                                            │
    │   ✅ AI Stylist Unlocked                                  │
    │   ├─ setStylistLocked(false)                             │
    │   ├─ Full critique visible                               │
    │   └─ "Premium Analysis Unlocked" badge                   │
    │                                                            │
    │   💎 Credits Available: [X] remaining                     │
    └───────────────────────────────────────────────────────────┘
                                 │
                                 ▼
    ┌───────────────────────────────────────────────────────────┐
    │              USER CONTINUES WITH PREMIUM                   │
    │                                                            │
    │   Each new image:                                         │
    │   ├─ Check credits > 0                                    │
    │   ├─ Deduct 1 credit                                      │
    │   ├─ Generate clean image (no watermark)                 │
    │   └─ Show full AI Stylist                                │
    │                                                            │
    │   When credits = 0:                                       │
    │   └─ Show pricing modal again                            │
    └───────────────────────────────────────────────────────────┘
```

## 🎯 Component Interaction Map

```
┌──────────────────────────────────────────────────────────────────┐
│                           App.tsx                                 │
│                        (Main Container)                           │
└──────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐      ┌───────────────────┐     ┌─────────────────┐
│ LoginScreen   │      │  PricingModal     │     │ WatermarkOverlay│
│ (Modal)       │      │                   │     │                 │
├───────────────┤      ├───────────────────┤     ├─────────────────┤
│ • Google auth │      │ • 4 tiers         │     │ • Diagonal text │
│ • Close btn   │      │ • Popular badge   │     │ • Center badge  │
│ • Privacy     │      │ • Cost/image      │     │ • Corner marks  │
└───────────────┘      │ • Current credits │     │ • Conditional   │
                       │ • Free trial info │     └─────────────────┘
                       └───────────────────┘              │
                                  │                       │
                                  │                       │
                       ┌──────────┴────────┐             │
                       ▼                   ▼             ▼
              ┌────────────────┐  ┌────────────────────────────┐
              │ PaymentService │  │      Result Display        │
              ├────────────────┤  ├────────────────────────────┤
              │ • createOrder  │  │ <WatermarkOverlay />       │
              │ • PayPal SDK   │  │ <AIStyleCritique />        │
              │ • Webhook      │  │ [Unlock Button]            │
              └────────────────┘  └────────────────────────────┘
                       │                       │
                       │                       │
                       ▼                       ▼
              ┌────────────────┐  ┌────────────────────────────┐
              │ StorageService │  │     AIStyleCritique        │
              ├────────────────┤  ├────────────────────────────┤
              │ • addCredits   │  │ • Locked state             │
              │ • deductCredit │  │   - Blurred text           │
              │ • freeTries    │  │   - Lock icon 🔒           │
              │ • isGuest      │  │   - Unlock button          │
              └────────────────┘  │ • Unlocked state           │
                       │          │   - Full critique          │
                       │          │   - Premium badge          │
                       │          └────────────────────────────┘
                       ▼                       │
              ┌────────────────┐              │
              │   Database     │              ▼
              ├────────────────┤  ┌────────────────────────────┐
              │ • User schema  │  │    AIStylistService        │
              │   - credits    │  ├────────────────────────────┤
              │   - freeTries  │  │ • generateCritique()       │
              │   - isPremium  │  │ • Gemini 1.5 Flash         │
              │ • POST /add    │  │ • Skin tone analysis       │
              │ • POST /deduct │  │ • Style compatibility      │
              └────────────────┘  │ • Fallback responses       │
                                  └────────────────────────────┘
```

## 🔄 State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    APP STATE (useState)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Authentication:                                             │
│  • user: User | null                                         │
│                                                              │
│  Business Logic (NEW):                                       │
│  • showWatermark: boolean                                    │
│  • showPricingModal: boolean                                 │
│  • showLoginModal: boolean                                   │
│  • stylistCritique: string                                   │
│  • stylistLocked: boolean                                    │
│  • pendingUnlock: string | null                             │
│                                                              │
│  Processing:                                                 │
│  • status: ProcessingStatus                                  │
│  • resultImage: string | null                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ State Updates
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Guest Mode  │  │ Logged In    │  │  Premium     │
│              │  │              │  │              │
│ freeTrials:  │  │ freeTrials:  │  │ credits: 5+  │
│  0-2 used    │  │  0-2 used    │  │ watermark:   │
│ watermark:   │  │ credits: 0   │  │  OFF         │
│  ON          │  │ watermark:   │  │ stylist:     │
│ stylist:     │  │  ON          │  │  UNLOCKED    │
│  LOCKED      │  │ stylist:     │  │              │
│              │  │  LOCKED      │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 📱 Responsive UI Layout

```
┌────────────────────────────────────────────────────┐
│                     Mobile                          │
├────────────────────────────────────────────────────┤
│  [Upload Section - Full Width]                     │
│  [Process Button]                                   │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  🖼️  Result with Watermark (if free trial)  │ │
│  │                                              │ │
│  │  Diagonal watermarks                         │ │
│  │  🔒 Center badge                             │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  [ 🔓 Remove Watermark & Unlock AI Stylist ]       │
│  "X free trials remaining"                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  💡 AI Stylist Opinion (Locked)             │ │
│  │                                              │ │
│  │  [Blurred preview]                           │ │
│  │  🔒 Lock Icon                                │ │
│  │  "Remove watermark to reveal"                │ │
│  │                                              │ │
│  │  [ 🔓 Unlock Analysis ]                      │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Desktop                                 │
├─────────────────────────────────────────────────────────────┤
│  [Upload Section - Side by Side]                            │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────┐ │
│  │  🖼️  Result          │    │  💡 AI Stylist Opinion   │ │
│  │  with Watermark      │    │                          │ │
│  │                      │    │  Locked/Unlocked state   │ │
│  │  [ 🔓 Unlock ]       │    │                          │ │
│  └──────────────────────┘    └──────────────────────────┘ │
│                                                              │
│  Pricing Modal (Center Overlay):                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │  [ 5₪ ]  [ 10₪ ⭐ ]  [ 20₪ ]  [ 50₪ ]                  ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

**Legend:**
- 🔒 = Locked feature
- ✅ = Unlocked/Available
- ⭐ = Popular choice
- 🎯 = User action point
- 💡 = AI feature
- 🖼️ = Image display
- 💎 = Credits/Premium
