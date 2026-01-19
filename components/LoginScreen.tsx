import React, { useState } from 'react';
import { Logo } from './Logo';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface LoginScreenProps {
  onLoginGoogle: () => Promise<void>;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginGoogle,
  lang, 
  setLang 
}) => {
  const t = translations[lang];
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onLoginGoogle();
    } catch (err: any) {
      setError(err.message || 'Google login failed. Please try again.');
      console.error('Google login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-200/30 dark:bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-300/20 dark:bg-yellow-600/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50 flex gap-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-1.5 shadow-lg">
         <button 
           onClick={() => setLang('en')} 
           className={`text-2xl md:text-3xl transition-all ${
             lang === 'en' 
               ? 'scale-110 drop-shadow-lg' 
               : 'opacity-50 grayscale hover:opacity-75 hover:scale-105'
           }`}
           title="English"
         >
           🇺🇸
         </button>
         <button 
           onClick={() => setLang('he')} 
           className={`text-2xl md:text-3xl transition-all ${
             lang === 'he' 
               ? 'scale-110 drop-shadow-lg' 
               : 'opacity-50 grayscale hover:opacity-75 hover:scale-105'
           }`}
           title="עברית"
         >
           🇮🇱
         </button>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex justify-center mb-8">
          <Logo size={80} />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t.welcome || 'Welcome to JewelryFit'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.signInToContinue || 'Sign in with Google to continue'}
          </p>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 py-4 rounded-xl font-semibold transition-all transform active:scale-95 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25"></circle>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{t.signingIn || 'Signing in...'}</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{t.continueGoogle || 'Continue with Google'}</span>
            </>
          )}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-500/50 rounded-lg text-red-800 dark:text-red-200 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {t.termsAgreement || 'By continuing, you agree to our Terms of Service and Privacy Policy'}
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{t.secureAuth || 'Secure authentication with Google'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
