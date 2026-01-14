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
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t.continueGoogle}
          </button>

          <button
            onClick={() => onLogin('facebook')}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white hover:bg-[#1864D9] py-3 rounded-xl font-medium transition-all transform active:scale-95 shadow-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {t.continueFacebook}
          </button>

          <button
            onClick={() => onLogin('apple')}
            className="w-full flex items-center justify-center gap-3 bg-black text-white hover:bg-gray-900 py-3 rounded-xl font-medium transition-all transform active:scale-95 border border-gray-700 dark:border-gray-600 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2.002-.156-3.959 1.156-4.961 1.156-.987 0-2.414-1.156-4.011-1.156zm3.43-4.832c.87-.987 1.454-2.364 1.299-3.738-1.208.052-2.674.805-3.545 1.831-.78.896-1.454 2.338-1.273 3.66 1.35.104 2.713-.766 3.519-1.753z"/>
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