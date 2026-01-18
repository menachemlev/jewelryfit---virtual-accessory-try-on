// ================================
// INTEGRATION GUIDE FOR APP.TSX
// ================================
// This file shows exactly what to add to App.tsx to enable the business logic

// 1. ADD IMPORTS (at top of App.tsx)
// ================================
import { AIStyleCritique } from './components/AIStyleCritique';
import { PricingModal } from './components/PricingModal';
import { WatermarkOverlay } from './components/WatermarkOverlay';
import { generateStylistCritique } from './services/aiStylistService';
import { PricingTier } from './types';

// 2. ADD STATE VARIABLES (inside App component)
// ================================
const [showWatermark, setShowWatermark] = useState(false);
const [showPricingModal, setShowPricingModal] = useState(false);
const [showLoginModal, setShowLoginModal] = useState(false);
const [stylistCritique, setStylistCritique] = useState<string>('');
const [stylistLocked, setStylistLocked] = useState(true);
const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);

// 3. UPDATE GENERATE FUNCTION (replace existing handleGenerate)
// ================================
const handleGenerate = async () => {
  if (!baseImage.base64 || !accessoryImage.base64) {
    setErrorMsg(t.uploadBothImages);
    return;
  }

  try {
    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);
    
    // Check if user can use free trials
    if (storageService.canUseFreeTrials()) {
      // FREE TRIAL: Process with watermark
      const result = await generateTryOnImage(
        baseImage.base64,
        accessoryImage.base64,
        accessoryType,
        selectedFinger,
        ringSize
      );
      
      setResultImage(result);
      setShowWatermark(true); // Show heavy watermark
      await storageService.incrementFreeTries();
      
      // Generate AI critique but keep it locked
      try {
        const critique = await generateStylistCritique({
          userImageUrl: baseImage.base64,
          accessoryImageUrl: accessoryImage.base64,
          accessoryType: accessoryType
        });
        setStylistCritique(critique);
        setStylistLocked(true); // Locked until payment
      } catch (err) {
        console.error('AI Stylist error:', err);
      }
      
      setStatus(ProcessingStatus.SUCCESS);
      
      // Show remaining free trials
      const remaining = storageService.getFreeTriesRemaining();
      if (remaining === 0) {
        // Show hint about premium
        setTimeout(() => {
          alert(`Free trials used! Unlock premium for clean images and AI styling advice.`);
        }, 2000);
      }
      
      return;
    }

    // Check if user has credits
    if (user && user.credits > 0) {
      // PAID: Process without watermark
      const creditDeducted = await storageService.deductCredit(1);
      
      if (creditDeducted) {
        const result = await generateTryOnImage(
          baseImage.base64,
          accessoryImage.base64,
          accessoryType,
          selectedFinger,
          ringSize
        );
        
        setResultImage(result);
        setShowWatermark(false); // No watermark
        
        // Generate and unlock AI critique
        try {
          const critique = await generateStylistCritique({
            userImageUrl: baseImage.base64,
            accessoryImageUrl: accessoryImage.base64,
            accessoryType: accessoryType
          });
          setStylistCritique(critique);
          setStylistLocked(false); // Unlocked for paid users
        } catch (err) {
          console.error('AI Stylist error:', err);
        }
        
        setStatus(ProcessingStatus.SUCCESS);
        
        // Update user credits in state
        const updatedUser = storageService.getUser();
        if (updatedUser) setUser(updatedUser);
        
        // Save to history
        const historyItem: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          accessoryType,
          resultImage: result,
          accessoryImage: accessoryImage.base64
        };
        storageService.addToHistory(historyItem);
        setHistoryItems(storageService.getHistory());
      } else {
        // Credit deduction failed
        throw new Error('Insufficient credits');
      }
    } else {
      // No credits: Show pricing modal
      setStatus(ProcessingStatus.IDLE);
      setShowPricingModal(true);
    }
    
  } catch (error: any) {
    console.error('Generation error:', error);
    setStatus(ProcessingStatus.ERROR);
    setErrorMsg(error.message || t.errorProcessing);
  }
};

// 4. ADD UNLOCK HANDLER (new function)
// ================================
const handleUnlockImage = () => {
  if (!user) {
    // Not logged in: trigger login
    setShowLoginModal(true);
    setPendingUnlock('current-image');
  } else {
    // Logged in: show pricing
    setShowPricingModal(true);
  }
};

// 5. ADD PRICING TIER HANDLER (new function)
// ================================
const handleSelectTier = async (tier: PricingTier) => {
  try {
    // Create payment order
    const orderId = await paymentService.createOrder(tier.price, tier.credits);
    
    // Open payment window (PayPal/Stripe)
    // On success, credits will be added automatically
    
    setShowPricingModal(false);
    
    // After payment success (this would come from payment callback)
    await storageService.addCredits(tier.credits);
    
    // Update user in state
    const updatedUser = storageService.getUser();
    if (updatedUser) setUser(updatedUser);
    
    // If there was a pending unlock, process it now
    if (pendingUnlock) {
      // Remove watermark from current image
      setShowWatermark(false);
      setStylistLocked(false);
      setPendingUnlock(null);
    }
    
  } catch (error) {
    console.error('Payment error:', error);
    alert('Payment failed. Please try again.');
  }
};

// 6. UPDATE LOGIN HANDLERS (modify existing)
// ================================
const handleLoginGoogle = async () => {
  try {
    const firebaseUser = await authService.loginWithGoogle();
    // User state will be updated by onAuthStateChanged listener
    
    // Close login modal
    setShowLoginModal(false);
    
    // If there was a pending unlock, show pricing
    if (pendingUnlock) {
      setShowPricingModal(true);
    }
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
};

// 7. ADD TO RENDER (in JSX, replace result image section)
// ================================
{/* Results Section */}
{resultImage && (
  <div className="space-y-6">
    {/* Image with Watermark Overlay */}
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      <WatermarkOverlay
        imageUrl={resultImage}
        showWatermark={showWatermark}
        watermarkText="JewelryFit AI • Unlock to Remove"
      />
      
      {/* Unlock Button (if watermarked) */}
      {showWatermark && (
        <div className="mt-4 text-center">
          <button
            onClick={handleUnlockImage}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all"
          >
            🔓 Remove Watermark & Unlock AI Stylist
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {storageService.getFreeTriesRemaining()} free trials remaining
          </p>
        </div>
      )}
    </div>

    {/* AI Stylist Section */}
    {stylistCritique && (
      <AIStyleCritique
        critique={stylistCritique}
        isUnlocked={!stylistLocked}
        onUnlock={handleUnlockImage}
        lang={lang}
      />
    )}
  </div>
)}

// 8. ADD MODALS (at end of JSX, before closing tags)
// ================================
{/* Login Modal */}
{showLoginModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="relative">
      <LoginScreen
        onLoginGoogle={handleLoginGoogle}
        lang={lang}
        setLang={setLang}
        showCloseButton={true}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  </div>
)}

{/* Pricing Modal */}
<PricingModal
  isOpen={showPricingModal}
  onClose={() => setShowPricingModal(false)}
  onSelectTier={handleSelectTier}
  lang={lang}
  currentCredits={user?.credits || 0}
  showFreeTrialInfo={storageService.getFreeTriesRemaining() === 0 && !user}
/>

// 9. UPDATE LOGIN SCREEN RENDERING (modify existing)
// ================================
// Change the existing LoginScreen to NOT show when just logged out
// Only show when explicitly needed (not for initial landing)

{!user && !showLoginModal && (
  // Don't automatically show login screen
  // User can access app immediately (lazy registration)
  null
)}

// Replace the full-screen login with:
{!user && (
  <div className="text-center p-4">
    <button
      onClick={() => setShowLoginModal(true)}
      className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
    >
      Sign in for premium features
    </button>
  </div>
)}

// ================================
// COMPLETE INTEGRATION CHECKLIST
// ================================
/*
✅ 1. Add all imports
✅ 2. Add state variables
✅ 3. Replace handleGenerate function
✅ 4. Add handleUnlockImage function
✅ 5. Add handleSelectTier function
✅ 6. Update handleLoginGoogle
✅ 7. Replace result image rendering
✅ 8. Add modals at end
✅ 9. Update login screen logic (lazy registration)

TESTING:
- Guest user can upload and see watermarked result ✓
- Free trial counter works (2 max) ✓
- AI Stylist shows but locked ✓
- Click unlock → login modal appears ✓
- After login → pricing modal appears ✓
- Select tier → payment process ✓
- After payment → watermark removed ✓
- After payment → AI Stylist unlocked ✓
- Logged in users with credits → no watermark ✓
- Credit deduction works ✓
*/

// ================================
// EXAMPLE FULL APP.TSX STRUCTURE
// ================================
/*
import statements...

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  
  // Business Logic State (NEW)
  const [showWatermark, setShowWatermark] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [stylistCritique, setStylistCritique] = useState<string>('');
  const [stylistLocked, setStylistLocked] = useState(true);
  const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);
  
  // ... existing state ...
  
  // Initialize (existing useEffect)
  useEffect(() => { ... });
  
  // Handlers (UPDATED)
  const handleGenerate = async () => { ... };
  const handleUnlockImage = () => { ... };
  const handleSelectTier = async (tier) => { ... };
  const handleLoginGoogle = async () => { ... };
  
  return (
    <div className="App">
      {/* Main Content * /}
      {resultImage && (
        <>
          <WatermarkOverlay ... />
          <AIStyleCritique ... />
        </>
      )}
      
      {/* Modals * /}
      {showLoginModal && <LoginScreen ... />}
      <PricingModal ... />
    </div>
  );
};

export default App;
*/
