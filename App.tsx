import React, { useState, useEffect } from 'react';
import { ImageUploader, ValidationState } from './components/ImageUploader';
import { LoginScreen } from './components/LoginScreen';
import { HistorySidebar } from './components/HistorySidebar';
import { ImageEditor } from './components/ImageEditor';
import { TutorialModal } from './components/TutorialModal';
import { PaymentModal } from './components/PaymentModal';
import { FingerSelector } from './components/FingerSelector';
import { RingSizeSelector } from './components/RingSizeSelector';
import { Logo } from './components/Logo';
import { JewelryReview } from './components/JewelryReview';
import { generateTryOnImage, detectAccessoryType, validateImageSuitability } from './services/geminiService';
import { storageService } from './services/storageService';
import { ImageState, ProcessingStatus, AccessoryType, User, HistoryItem, Language, Finger, RingSize } from './types';
import { translations } from './constants/translations';
import { authService } from './services/authService';


// Declare window interface for AI Studio wrapper
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  
  // App State
  const [baseImage, setBaseImage] = useState<ImageState>({ file: null, previewUrl: null, base64: null });
  const [accessoryImage, setAccessoryImage] = useState<ImageState>({ file: null, previewUrl: null, base64: null });
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessoryType, setAccessoryType] = useState<AccessoryType>('WATCH');
  const [selectedFinger, setSelectedFinger] = useState<Finger>('RING');
  const [ringSize, setRingSize] = useState<RingSize>('58');
  const [isDetectingType, setIsDetectingType] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState(false);
  
  // Validation State
  const [baseImageValidation, setBaseImageValidation] = useState<ValidationState>({ status: 'idle' });

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Theme & Lang State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [lang, setLang] = useState<Language>('en');

  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<'base' | 'accessory' | null>(null);

  // Tutorial State
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Translations
  const t = translations[lang];

  // Initialize Data
  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        storageService.setUser(firebaseUser);
        // Fetch latest credits from database
        await storageService.fetchCredits();
        const updatedUser = storageService.getUser();
        if (updatedUser) setUser(updatedUser);
      } else {
        setUser(null);
        storageService.setUser(null);
      }
    });

    // Load History
    setHistoryItems(storageService.getHistory());

    // Load Theme
    const storedTheme = storageService.getTheme();
    setTheme(storedTheme);
    
    // Load Lang
    const storedLang = storageService.getLanguage();
    setLang(storedLang);

    // Check API Key
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(true);
      }
    };
    checkKey();
    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    storageService.setTheme(theme);
  }, [theme]);

  // Lang Effect
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    storageService.setLanguage(lang);
  }, [lang]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = async (provider: 'google') => {
    try {
      let newUser: User;
      
      if (provider === 'google') {
        newUser = await authService.loginWithGoogle();
      } else {
        throw new Error('Unknown provider');
      }
      
      setUser(newUser);
      storageService.setUser(newUser);
      
      // Fetch latest credits from database
      await storageService.fetchCredits();
      const updatedUser = storageService.getUser();
      if (updatedUser) setUser(updatedUser);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const handleLoginGoogle = async () => {
    return handleLogin('google');
  };

  const handleLoginEmail = async (email: string, password: string) => {
    try {
      const newUser = await authService.loginWithEmail(email, password);
      setUser(newUser);
      storageService.setUser(newUser);
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    }
  };

  const handleRegisterEmail = async (email: string, password: string, displayName: string) => {
    try {
      const newUser = await authService.registerWithEmail(email, password, displayName);
      setUser(newUser);
      storageService.setUser(newUser);
    } catch (error) {
      console.error('Email registration error:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      storageService.setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  const handleOpenPayment = () => {
    setPaymentModalOpen(true);
  };

  const handlePurchase = async (amount: number) => {
    await storageService.addCredits(amount);
    const updatedUser = storageService.getUser();
    setUser(updatedUser);
    setPaymentModalOpen(false);
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Failed to select key", e);
      }
    }
  };

  // Editor Handlers
  const openEditor = (target: 'base' | 'accessory') => {
    setEditingTarget(target);
    setEditorOpen(true);
  };

  const handleEditorSave = async (newBase64: string) => {
    if (editingTarget === 'base') {
      setBaseImage(prev => ({ ...prev, previewUrl: newBase64, base64: newBase64 }));
      // Re-validate on edit
      setBaseImageValidation({ status: 'analyzing' });
      const analysis = await validateImageSuitability(newBase64, accessoryType, lang, t.photoSuitable, t.photoUnsuitable);
      setBaseImageValidation({
        status: analysis.suitable ? 'valid' : 'invalid',
        message: analysis.message
      });
    } else if (editingTarget === 'accessory') {
      setAccessoryImage(prev => ({ ...prev, previewUrl: newBase64, base64: newBase64 }));
      // Re-detect on edit save
      setIsDetectingType(true);
      try {
        const type = await detectAccessoryType(newBase64);
        
        // Only if detection changed the type do we update and re-validate
        if (type !== accessoryType) {
            setAccessoryType(type);
            // Trigger re-validation of base image against new type
            if (baseImage.base64) {
                setBaseImageValidation({ status: 'analyzing' });
                const analysis = await validateImageSuitability(baseImage.base64, type, lang, t.photoSuitable, t.photoUnsuitable);
                setBaseImageValidation({
                    status: analysis.suitable ? 'valid' : 'invalid',
                    message: analysis.message
                });
            }
        }
      } catch (e) {
        console.error("Auto-detect failed", e);
      } finally {
        setIsDetectingType(false);
      }
    }
    setEditorOpen(false);
    setEditingTarget(null);
  };

  const handleEditorCancel = () => {
    setEditorOpen(false);
    setEditingTarget(null);
  };

  const handleBaseImageUpload = async (state: ImageState) => {
    setBaseImage(state);
    if (state.base64) {
      setBaseImageValidation({ status: 'analyzing' });
      try {
        const analysis = await validateImageSuitability(state.base64, accessoryType, lang, t.photoSuitable, t.photoUnsuitable);
        setBaseImageValidation({
          status: analysis.suitable ? 'valid' : 'invalid',
          message: analysis.message
        });
      } catch (e) {
        console.error("Validation failed", e);
        setBaseImageValidation({ status: 'idle' });
      }
    } else {
      setBaseImageValidation({ status: 'idle' });
    }
  };

  const handleAccessoryUpload = async (state: ImageState) => {
    setAccessoryImage(state);
    if (state.base64) {
      setIsDetectingType(true);
      try {
        const type = await detectAccessoryType(state.base64);
        
        // Only update and revalidate if type changed
        if (type !== accessoryType) {
            setAccessoryType(type);
            
            // If we have a base image, re-validate it against the new type
            if (baseImage.base64) {
                setBaseImageValidation({ status: 'analyzing' });
                const analysis = await validateImageSuitability(baseImage.base64, type, lang, t.photoSuitable, t.photoUnsuitable);
                setBaseImageValidation({
                    status: analysis.suitable ? 'valid' : 'invalid',
                    message: analysis.message
                });
            }
        }
      } catch (e) {
        console.error("Auto-detect failed", e);
      } finally {
        setIsDetectingType(false);
      }
    }
  };

  const handleShare = async () => {
    if (!resultImage) return;

    try {
      // Convert base64 data URL to Blob/File for sharing
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const file = new File([blob], 'jewelryfit-result.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: t.shareTitle,
          text: t.shareText,
          files: [file],
        });
      } else {
        // Fallback for desktop/unsupported browsers
        alert("Native sharing is not supported on this device/browser. Please download the image to share it manually.");
      }
    } catch (e) {
      console.error("Share failed", e);
      alert("Could not share image.");
    }
  };

  // STANDARD PREVIEW (FREE)
  const handleGenerate = async () => {
    if (!baseImage.base64 || !accessoryImage.base64) {
      setErrorMsg(t.uploadBoth);
      return;
    }

    // Check if user has enough credits
    if (!user || user.credits < 1) {
      setErrorMsg(t.insufficientFunds);
      setPaymentModalOpen(true);
      return;
    }

    // Rate Limit Check
    const rateCheck = storageService.checkRateLimit();
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.message || t.rateLimit);
      return;
    }

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);
    setResultImage(null);
    setShowComparison(false);

    try {
      // Use Standard generation
      const generatedImageBase64 = await generateTryOnImage(
        baseImage.base64, 
        accessoryImage.base64, 
        accessoryType,
        accessoryType === 'RING' ? selectedFinger : undefined,
        accessoryType === 'RING' ? ringSize : undefined
      );
      
      // Success - result generated successfully
      setResultImage(generatedImageBase64);
      setStatus(ProcessingStatus.SUCCESS);
      
      // Deduct 1 credit
      await storageService.deductCredit(1);
      const updatedUser = storageService.getUser();
      if (updatedUser) setUser(updatedUser);
      
      // Record Usage
      storageService.recordUsage();
      
      // Save to history in Full HD quality (only after successful generation)
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        accessoryType,
        resultImage: generatedImageBase64,
        accessoryImage: accessoryImage.base64!,
        isHD: false
      };
      
      await storageService.saveHistoryItem(newHistoryItem);
      setHistoryItems(storageService.getHistory()); 

    } catch (e: any) {
      setStatus(ProcessingStatus.ERROR);
      const msg = e.message || "An unexpected error occurred.";
      // ... Error handling logic
       const isRateLimit = 
        e.status === 429 || 
        e.code === 429 || 
        (e.message && (e.message.includes('429') || e.message.includes('Quota') || e.message.includes('RESOURCE_EXHAUSTED')));

      if (isRateLimit) {
        setErrorMsg("Server is experiencing high traffic. Please wait a minute and try again.");
      } else if (msg.includes("403") || msg.includes("PERMISSION_DENIED") || msg.includes("permission")) {
        setHasKey(false);
        setErrorMsg(t.apiKeyError);
      } else {
        setErrorMsg(msg);
      }
      setErrorMsg(msg);
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setResultImage(item.resultImage);
    setAccessoryType(item.accessoryType);
    
    // Restore Accessory Image State if available in history item (best effort)
    if (item.accessoryImage) {
        setAccessoryImage({
            file: null,
            previewUrl: item.accessoryImage,
            base64: item.accessoryImage
        });
    }

    setShowHistory(false);
    // Note: We don't restore base image as it might not be saved to save space
    setBaseImage({ file: null, previewUrl: null, base64: null });
    setBaseImageValidation({ status: 'idle' });
    setStatus(ProcessingStatus.SUCCESS);
  };

  const handleReset = () => {
    setBaseImage({ file: null, previewUrl: null, base64: null });
    setBaseImageValidation({ status: 'idle' });
    setAccessoryImage({ file: null, previewUrl: null, base64: null });
    setResultImage(null);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
    setShowComparison(false);
  };

  const handleTypeChange = async (type: AccessoryType) => {
    if (type === accessoryType) return;
    
    setAccessoryType(type);
    setErrorMsg(null);
    
    // Re-validate base image if it exists when type changes
    if (baseImage.base64) {
        setBaseImageValidation({ status: 'analyzing' });
        try {
            const analysis = await validateImageSuitability(baseImage.base64, type, lang, t.photoSuitable, t.photoUnsuitable);
            setBaseImageValidation({
                status: analysis.suitable ? 'valid' : 'invalid',
                message: analysis.message
            });
        } catch(e) {
             setBaseImageValidation({ status: 'idle' });
        }
    }
  };

  const getBaseLabel = () => {
    if (accessoryType === 'RING') return t.labels.hand;
    return t.labels.wrist;
  };

  const getAccessoryLabel = () => {
    if (accessoryType === 'RING') return t.labels.ring;
    if (accessoryType === 'BRACELET') return t.labels.bracelet;
    return t.labels.watch;
  };

  // 1. Auth Gate
  if (!user) {
    return <LoginScreen 
      onLoginEmail={handleLoginEmail} 
      onRegisterEmail={handleRegisterEmail}
      onLoginGoogle={handleLoginGoogle}
      lang={lang} 
      setLang={setLang} 
    />;
  }

  // 2. API Key Gate
  if (!hasKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-black text-gray-900 dark:text-white flex items-center justify-center p-4 transition-colors duration-300">
        <div className="max-w-md w-full bg-white/80 dark:bg-gray-800/50 backdrop-blur-md p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl text-center relative">
          {/* Language Toggle */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => setLang('en')} className={`text-xl hover:scale-110 transition-transform ${lang === 'en' ? 'opacity-100' : 'opacity-50 grayscale'}`} title="English">🇺🇸</button>
            <button onClick={() => setLang('he')} className={`text-xl hover:scale-110 transition-transform ${lang === 'he' ? 'opacity-100' : 'opacity-50 grayscale'}`} title="Hebrew">🇮🇱</button>
          </div>
          <div className="flex justify-center mb-6">
            <Logo className="w-20 h-20 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">{t.connectKey}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{t.connectKeyDesc}</p>
          <button onClick={handleSelectKey} className="w-full py-3 px-6 rounded-xl font-bold bg-yellow-500 text-black hover:bg-yellow-400 transition-colors">{t.connect}</button>
        </div>
      </div>
    );
  }

  // 3. Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-black text-gray-900 dark:text-white p-4 md:p-8 transition-colors duration-300 overflow-x-hidden w-full">
      
      {/* Modals */}
      <TutorialModal 
        isOpen={tutorialOpen} 
        onClose={() => setTutorialOpen(false)} 
        initialType={accessoryType}
        lang={lang}
      />

      <PaymentModal 
        isOpen={paymentModalOpen} 
        onClose={() => setPaymentModalOpen(false)} 
        onPurchase={handlePurchase}
        lang={lang}
      />
      
      {editorOpen && (editingTarget === 'base' ? baseImage.previewUrl : accessoryImage.previewUrl) && (
        <ImageEditor 
          imageSrc={editingTarget === 'base' ? baseImage.previewUrl! : accessoryImage.previewUrl!}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          lang={lang}
        />
      )}

      <HistorySidebar 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        items={historyItems} 
        onSelect={handleHistorySelect}
        lang={lang}
      />

      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10 text-yellow-600 dark:text-yellow-500" />
            <h1 style={{"line-height":"unset"}} className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-700 dark:from-yellow-400 dark:to-yellow-600 tracking-tight">
              {t.appTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
            {/* Language Toggle */}
            <div className="flex gap-1 md:gap-2 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
                <button 
                  onClick={() => setLang('en')} 
                  className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded transition-all ${
                    lang === 'en' 
                      ? 'bg-yellow-500 text-black shadow-md' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
                  title="English"
                >
                  EN
                </button>
                <button 
                  onClick={() => setLang('he')} 
                  className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded transition-all ${
                    lang === 'he' 
                      ? 'bg-yellow-500 text-black shadow-md' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
                  title="Hebrew"
                >
                  HE
                </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-700">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
            </div>

            {/* Credits Display */}
            <button
              onClick={handleOpenPayment}
              className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 rounded-full border border-yellow-600 shadow-md hover:shadow-lg transition-all cursor-pointer"
              title={t.buyCredits}
            >
              <span className="text-base md:text-lg">💎</span>
              <span className="text-sm font-bold text-gray-900">{user.credits}</span>
            </button>

            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
              title={t.history}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t.logout}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:inline ml-1 text-sm font-medium">{t.logout}</span>
            </button>
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <section className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl transition-colors duration-300">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className="bg-yellow-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  {t.configuration}
                </h2>
                {isDetectingType && (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                     <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                     <span className="text-xs font-medium animate-pulse">{t.detecting}</span>
                  </div>
                )}
             </div>

            {/* Accessory Type Selector */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">{t.accessoryType}</label>
              <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                {(['WATCH', 'BRACELET', 'RING'] as AccessoryType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`py-2 px-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
                      accessoryType === type 
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  >
                    {t.types[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Finger Selector (Conditional) */}
            {accessoryType === 'RING' && (
               <>
                 <FingerSelector 
                   selectedFinger={selectedFinger}
                   onChange={setSelectedFinger}
                   lang={lang}
                 />
                 <RingSizeSelector 
                   selectedSize={ringSize}
                   onChange={setRingSize}
                   lang={lang}
                   handImage={baseImage.base64}
                   fingerType={selectedFinger}
                 />
               </>
            )}
            
            <div className="space-y-6 mt-6">
              <div className="relative">
                 {/* Photo Guide Button */}
                <button
                  onClick={() => setTutorialOpen(true)}
                  className={`absolute top-0 text-xs font-bold text-yellow-600 dark:text-yellow-500 hover:underline flex items-center gap-1 z-10 ${lang === 'he' ? 'left-0' : 'right-0'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {t.photoGuide}
                </button>
                
                <ImageUploader 
                  id="base-upload"
                  label={getBaseLabel()} 
                  imageState={baseImage} 
                  onImageChange={handleBaseImageUpload}
                  onEdit={() => openEditor('base')}
                  lang={lang}
                  validation={baseImageValidation}
                />
              </div>
              
              <ImageUploader 
                id="accessory-upload"
                label={getAccessoryLabel()} 
                imageState={accessoryImage} 
                onImageChange={handleAccessoryUpload}
                onEdit={() => openEditor('accessory')}
                lang={lang}
              />
            </div>

            {errorMsg && (
              <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-500/50 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={status === ProcessingStatus.PROCESSING || status === ProcessingStatus.UPSCALING || !baseImage.base64 || !accessoryImage.base64 || isDetectingType || baseImageValidation.status === 'analyzing'}
              className={`mt-8 w-full py-4 rounded-xl font-bold text-lg tracking-wide shadow-lg transition-all duration-300
                ${status === ProcessingStatus.PROCESSING || status === ProcessingStatus.UPSCALING || isDetectingType || baseImageValidation.status === 'analyzing'
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400' 
                  : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black hover:shadow-yellow-500/20 transform hover:-translate-y-0.5 active:translate-y-0'
                }`}
            >
              {status === ProcessingStatus.PROCESSING ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t.generating}
                </span>
              ) : isDetectingType ? (
                <span className="flex items-center justify-center gap-2">
                   {t.detecting}
                </span>
              ) : baseImageValidation.status === 'analyzing' ? (
                <span className="flex items-center justify-center gap-2">
                   {t.analyzing}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {`${t.generateCost} ${t.types[accessoryType]}`}
                </span>
              )}
            </button>
          </section>

          {/* Result Section */}
          <section className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl min-h-[500px] flex flex-col transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <span className="bg-yellow-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                {t.result}
              </h2>
              {resultImage && accessoryImage.previewUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t.compareOriginal}</span>
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${showComparison ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${showComparison ? 'translate-x-6 rtl:-translate-x-6' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative min-h-[400px]">
              {resultImage ? (
                <div className="w-full h-full flex gap-1 relative">
                  {/* Comparison Side By Side */}
                  {showComparison && accessoryImage.previewUrl && (
                     <div className="flex-1 relative group bg-gray-200 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700">
                        <img 
                          src={accessoryImage.previewUrl} 
                          alt="Original Accessory" 
                          className="w-full h-full object-contain"
                        />
                         <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">Original</span>
                     </div>
                  )}

                  <div className="flex-1 relative group flex items-center justify-center">
                    <img 
                      src={resultImage} 
                      alt="Generated Try-On" 
                      className="max-w-full max-h-[600px] object-contain"
                    />
                    
                    {/* Share/Download Buttons */}
                    <div className={`absolute top-4 ${lang === 'he' ? 'left-4' : 'right-4'} flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20`}>
                      <button 
                        onClick={handleShare}
                        className="bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black text-gray-900 dark:text-white p-2 rounded-lg backdrop-blur-md transition-colors border border-gray-200 dark:border-gray-700"
                        title={t.share}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                      <a 
                        href={resultImage} 
                        download="jewelryfit-result.png"
                        className="bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black text-gray-900 dark:text-white p-2 rounded-lg backdrop-blur-md transition-colors border border-gray-200 dark:border-gray-700"
                        title={t.download}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8">
                  {status === ProcessingStatus.PROCESSING ? (
                     <div className="flex flex-col items-center gap-4">
                        <div className="relative w-16 h-16">
                           <div className="absolute inset-0 rounded-full border-4 border-gray-300 dark:border-gray-700"></div>
                           <div className="absolute inset-0 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 animate-pulse text-sm">{t.stylistWorking}</p>
                     </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 dark:text-gray-600">
                      <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <p className="text-sm">{t.noResult}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {resultImage && (
              <>
                {/* AI Review Section */}
                <JewelryReview 
                  resultImage={resultImage} 
                  language={lang}
                  accessoryType={accessoryType}
                />
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleReset}
                    className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm font-medium underline decoration-gray-400 dark:decoration-gray-600 hover:decoration-black dark:hover:decoration-white underline-offset-4 transition-all"
                  >
                    {t.startOver}
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;

