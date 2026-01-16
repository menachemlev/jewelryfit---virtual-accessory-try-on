import React, { useState } from 'react';
import { Logo } from './Logo';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface LoginScreenProps {
  onLoginEmail: (email: string, password: string) => Promise<void>;
  onRegisterEmail: (email: string, password: string, displayName: string) => Promise<void>;
  onLoginGoogle: () => Promise<void>;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginEmail, 
  onRegisterEmail, 
  onLoginGoogle,
  lang, 
  setLang 
}) => {
  const t = translations[lang];
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          throw new Error(t.nameRequired);
        }
        if (password !== confirmPassword) {
          throw new Error(t.passwordsDoNotMatch);
        }
        if (password.length < 6) {
          throw new Error(t.passwordMinLength);
        }
        await onRegisterEmail(email, password, displayName);
      } else {
        await onLoginEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || (isRegister ? t.registrationFailed : t.loginFailed));
      console.error(`${isRegister ? 'Register' : 'Login'} error:`, err);
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Language Toggle */}
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
          <h1 style={{"lineHeight":"unset"}} className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-yellow-700 dark:from-yellow-400 dark:to-yellow-600 mb-2 tracking-tighter">
            {t.appTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              !isRegister 
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {t.login}
          </button>
          <button
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              isRegister 
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {t.register}
          </button>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.fullName}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.enterName}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.enterEmail}
              disabled={isLoading}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.enterPassword}
              disabled={isLoading}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.confirmPasswordPlaceholder}
                disabled={isLoading}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all transform active:scale-95"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25"></circle>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRegister ? t.registering : t.loggingIn}
              </>
            ) : (
              isRegister ? t.createAccount : t.signIn
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">{t.orContinueWith}</span>
          </div>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 py-3 rounded-lg font-medium transition-all transform active:scale-95 shadow-sm"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25"></circle>
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          )}
          {t.continueGoogle}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-500/50 rounded-lg text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {t.terms}
          </p>
        </div>
      </div>
    </div>
  );
};