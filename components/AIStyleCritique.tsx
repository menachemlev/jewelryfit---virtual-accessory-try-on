import React from 'react';

interface AIStyleCritiqueProps {
  critique: string;
  isUnlocked: boolean;
  onUnlock: () => void;
  lang: 'en' | 'he' | 'ar';
}

export const AIStyleCritique: React.FC<AIStyleCritiqueProps> = ({ 
  critique, 
  isUnlocked, 
  onUnlock,
  lang 
}) => {
  const translations = {
    en: {
      title: "AI Stylist Opinion",
      subtitle: "Professional styling advice powered by AI",
      locked: "Want to know if this matches your style?",
      unlock: "Remove watermark to reveal",
      button: "Unlock Analysis"
    },
    he: {
      title: "חוות דעת מעצב AI",
      subtitle: "ייעוץ סטיילינג מקצועי מבוסס AI",
      locked: "רוצה לדעת אם זה מתאים לסגנון שלך?",
      unlock: "הסר סימן מים כדי לחשוף",
      button: "פתח ניתוח"
    },
    ar: {
      title: "رأي مصمم الذكاء الاصطناعي",
      subtitle: "نصائح تصميم احترافية بالذكاء الاصطناعي",
      locked: "هل تريد معرفة ما إذا كان هذا يناسب أسلوبك؟",
      unlock: "قم بإزالة العلامة المائية للكشف",
      button: "فتح التحليل"
    }
  };

  const t = translations[lang];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t.title}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {isUnlocked ? (
          /* Unlocked: Show actual critique */
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {critique}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Premium Analysis Unlocked</span>
            </div>
          </div>
        ) : (
          /* Locked: Show blurred preview */
          <div className="relative">
            {/* Blurred text */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-200 dark:border-purple-700 blur-sm select-none pointer-events-none">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                This luxury watch perfectly complements your elegant style. The rose gold tone harmonizes beautifully with warm skin undertones, creating a sophisticated and refined look. The classic design suggests timeless taste...
              </p>
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-purple-900/80 via-purple-800/60 to-transparent rounded-xl backdrop-blur-sm">
              <div className="text-center px-4 space-y-3">
                {/* Lock Icon */}
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-500 flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                {/* Text */}
                <div className="space-y-1">
                  <p className="text-white font-semibold text-sm">
                    {t.locked}
                  </p>
                  <p className="text-purple-200 text-xs">
                    {t.unlock}
                  </p>
                </div>

                {/* Unlock Button */}
                <button
                  onClick={onUnlock}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  {t.button}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Powered by AI badge */}
      {isUnlocked && (
        <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 7H7v6h6V7z" />
            <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
          </svg>
          <span>Powered by Gemini AI</span>
        </div>
      )}
    </div>
  );
};
