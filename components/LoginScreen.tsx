import React from 'react';
import { Logo } from './Logo';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface LoginScreenProps {
  onLogin: (provider: 'google' | 'facebook' | 'apple') => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, lang, setLang }) => {
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Language Toggle Absolute */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
         <button onClick={() => setLang('en')} className={`text-2xl hover:scale-110 transition-transform ${lang === 'en' ? 'opacity-100' : 'opacity-50 grayscale'}`} title="English">🇺🇸</button>
         <button onClick={() => setLang('he')} className={`text-2xl hover:scale-110 transition-transform ${lang === 'he' ? 'opacity-100' : 'opacity-50 grayscale'}`} title="Hebrew">🇮🇱</button>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-400/20 dark:bg-yellow-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full bg-white/80 dark:bg-gray-800/60 backdrop-blur-xl p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl z-10 transition-colors duration-300">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="mb-4">
             <Logo className="w-24 h-24 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-yellow-700 dark:from-yellow-400 dark:to-yellow-600 mb-2 tracking-tighter">
            {t.appTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onLogin('google')}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-50 border border-gray-300 dark:border-transparent py-3 rounded-xl font-medium transition-all transform active:scale-95 shadow-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            {t.continueGoogle}
          </button>

          <button
            onClick={() => onLogin('facebook')}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white hover:bg-[#1864D9] py-3 rounded-xl font-medium transition-all transform active:scale-95 shadow-sm"
          >
            <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" className="w-5 h-5 bg-white rounded-full" />
            {t.continueFacebook}
          </button>

          <button
            onClick={() => onLogin('apple')}
            className="w-full flex items-center justify-center gap-3 bg-black text-white hover:bg-gray-900 py-3 rounded-xl font-medium transition-all transform active:scale-95 border border-gray-700 dark:border-gray-600 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-.96-.4-1.96-.4-2.96 0-1.07.45-2.25.65-3.13-.35-2.72-3.11-2.27-8.74 2.16-10.46 1.18-.45 2.15-.1 2.92.17.85.35 1.7.35 2.54 0 .75-.3 2.1-.55 3.3.4 1.25 1 2.05 2.35 2.05 2.35-.05.15-1.3 4.25-3.8 7.49zm-2.8-17.3c1.4.15 2.55 1.35 2.45 3.1-1.45.15-3.05-1-3.1-3.05.05 0 0 0 0 0 .75-1 1.75-1 1.75-1 .35.15.65-.05.65-.05z"/>
            </svg>
            {t.continueApple}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {t.terms}
          </p>
        </div>
      </div>
    </div>
  );
};