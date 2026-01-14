import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { LoginScreen } from './components/LoginScreen';
import { HistorySidebar } from './components/HistorySidebar';
import { ImageEditor } from './components/ImageEditor';
import { generateTryOnImage } from './services/geminiService';
import { storageService } from './services/storageService';
import { ImageState, ProcessingStatus, AccessoryType, User, HistoryItem } from './types';

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
  const [hasKey, setHasKey] = useState<boolean>(false);
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<'base' | 'accessory' | null>(null);

  // Initialize Data
  useEffect(() => {
    // Check Auth
    const storedUser = storageService.getUser();
    if (storedUser) setUser(storedUser);

    // Load History
    setHistoryItems(storageService.getHistory());

    // Load Theme
    const storedTheme = storageService.getTheme();
    setTheme(storedTheme);

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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = (provider: 'google' | 'facebook' | 'apple') => {
    const newUser = storageService.login(provider);
    setUser(newUser);
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
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

  const handleEditorSave = (newBase64: string) => {
    if (editingTarget === 'base') {
      setBaseImage(prev => ({ ...prev, previewUrl: newBase64, base64: newBase64 }));
    } else if (editingTarget === 'accessory') {
      setAccessoryImage(prev => ({ ...prev, previewUrl: newBase64, base64: newBase64 }));
    }
    setEditorOpen(false);
    setEditingTarget(null);
  };

  const handleEditorCancel = () => {
    setEditorOpen(false);
    setEditingTarget(null);
  };

  const handleGenerate = async () => {
    if (!baseImage.base64 || !accessoryImage.base64) {
      setErrorMsg("Please upload both photos.");
      return;
    }

    // Rate Limit Check
    const rateCheck = storageService.checkRateLimit();
    if (!rateCheck.allowed) {
      setErrorMsg(rateCheck.message || "Rate limit exceeded.");
      return;
    }

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);
    setResultImage(null);

    try {
      const generatedImageBase64 = await generateTryOnImage(baseImage.base64, accessoryImage.base64, accessoryType);
      
      // Success
      setResultImage(generatedImageBase64);
      setStatus(ProcessingStatus.SUCCESS);
      
      // Record Usage & History
      storageService.recordUsage();
      
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        accessoryType,
        resultImage: generatedImageBase64
      };
      
      storageService.saveHistoryItem(newHistoryItem);
      setHistoryItems(storageService.getHistory()); // Refresh list

    } catch (e: any) {
      setStatus(ProcessingStatus.ERROR);
      const msg = e.message || "An unexpected error occurred.";
      
      if (msg.includes("403") || msg.includes("PERMISSION_DENIED") || msg.includes("permission")) {
        setHasKey(false);
        setErrorMsg("API Key permission denied. Please select a valid key.");
      } else {
        setErrorMsg(msg);
      }
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setResultImage(item.resultImage);
    setAccessoryType(item.accessoryType);
    setShowHistory(false);
    setBaseImage({ file: null, previewUrl: null, base64: null });
    setAccessoryImage({ file: null, previewUrl: null, base64: null });
    setStatus(ProcessingStatus.SUCCESS);
  };

  const handleReset = () => {
    setBaseImage({ file: null, previewUrl: null, base64: null });
    setAccessoryImage({ file: null, previewUrl: null, base64: null });
    setResultImage(null);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
  };

  const handleTypeChange = (type: AccessoryType) => {
    setAccessoryType(type);
    setErrorMsg(null);
  };

  const getBaseLabel = () => {
    return accessoryType === 'RING' ? 'Hand Photo' : 'Wrist/Arm Photo';
  };

  const getAccessoryLabel = () => {
    return `${accessoryType.charAt(0) + accessoryType.slice(1).toLowerCase()} Photo`;
  };

  // 1. Auth Gate
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 2. API Key Gate
  if (!hasKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-black text-gray-900 dark:text-white flex items-center justify-center p-4 transition-colors duration-300">
        <div className="max-w-md w-full bg-white/80 dark:bg-gray-800/50 backdrop-blur-md p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl text-center">
          <h1 className="text-2xl font-bold mb-4">Connect API Key</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">To use JewelryFit, please connect your Google Cloud Project.</p>
          <button onClick={handleSelectKey} className="w-full py-3 px-6 rounded-xl font-bold bg-yellow-500 text-black hover:bg-yellow-400 transition-colors">Connect</button>
        </div>
      </div>
    );
  }

  // 3. Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-black text-gray-900 dark:text-white p-4 md:p-8 transition-colors duration-300">
      
      {/* Editor Modal */}
      {editorOpen && (editingTarget === 'base' ? baseImage.previewUrl : accessoryImage.previewUrl) && (
        <ImageEditor 
          imageSrc={editingTarget === 'base' ? baseImage.previewUrl! : accessoryImage.previewUrl!}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      <HistorySidebar 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        items={historyItems} 
        onSelect={handleHistorySelect}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-700 dark:from-yellow-400 dark:to-yellow-600 tracking-tight">
              JewelryFit
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-700">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
            </div>

            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
              title="History"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:underline decoration-yellow-500 underline-offset-4"
            >
              Logout
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
                  Configuration
                </h2>
             </div>

            {/* Accessory Type Selector */}
            <div className="mb-8">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Accessory Type</label>
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
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              <ImageUploader 
                id="base-upload"
                label={getBaseLabel()} 
                imageState={baseImage} 
                onImageChange={setBaseImage}
                onEdit={() => openEditor('base')}
              />
              
              <ImageUploader 
                id="accessory-upload"
                label={getAccessoryLabel()} 
                imageState={accessoryImage} 
                onImageChange={setAccessoryImage}
                onEdit={() => openEditor('accessory')}
              />
            </div>

            {errorMsg && (
              <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-500/50 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={status === ProcessingStatus.PROCESSING || !baseImage.base64 || !accessoryImage.base64}
              className={`mt-8 w-full py-4 rounded-xl font-bold text-lg tracking-wide shadow-lg transition-all duration-300
                ${status === ProcessingStatus.PROCESSING 
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
                  Generating...
                </span>
              ) : (
                `Try On ${accessoryType.charAt(0) + accessoryType.slice(1).toLowerCase()}`
              )}
            </button>
          </section>

          {/* Result Section */}
          <section className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl min-h-[500px] flex flex-col transition-colors duration-300">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="bg-yellow-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Result
            </h2>

            <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-900/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative min-h-[400px]">
              {resultImage ? (
                <div className="relative w-full h-full group flex items-center justify-center">
                  <img 
                    src={resultImage} 
                    alt="Generated Try-On" 
                    className="max-w-full max-h-[600px] object-contain"
                  />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <a 
                      href={resultImage} 
                      download="jewelryfit-result.png"
                      className="bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black text-gray-900 dark:text-white p-2 rounded-lg backdrop-blur-md transition-colors border border-gray-200 dark:border-gray-700"
                      title="Download"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                    </a>
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
                        <p className="text-gray-600 dark:text-gray-400 animate-pulse text-sm">AI Stylist is working...</p>
                     </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 dark:text-gray-600">
                      <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <p className="text-sm">No result yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {resultImage && (
              <div className="mt-6 flex justify-end">
                 <button
                  onClick={handleReset}
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm font-medium underline decoration-gray-400 dark:decoration-gray-600 hover:decoration-black dark:hover:decoration-white underline-offset-4 transition-all"
                >
                  Start Over
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;