import React, { useState } from 'react';
import { AccessoryType, Language } from '../types';
import { translations } from '../constants/translations';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: AccessoryType;
  lang: Language;
}

const TutorialIllustration: React.FC<{ type: 'RING' | 'WATCH'; status: 'good' | 'bad' }> = ({ type, status }) => {
  if (type === 'WATCH') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Arm background */}
        <path d="M40 0 C45 30 45 70 40 100 L60 100 C55 70 55 30 60 0 Z" fill="currentColor" opacity="0.1" />
        {/* The Arm */}
        <path 
          d="M45 10 L45 90 C45 95 55 95 55 90 L55 10" 
          stroke="currentColor" 
          strokeWidth="4" 
          fill="none" 
          strokeLinecap="round" 
        />
        {/* Wrist Bone Circle */}
        <circle cx="53" cy="70" r="2" fill="currentColor" opacity={status === 'good' ? "1" : "0.2"} />
        
        {status === 'bad' && (
          <>
            {/* Long sleeve */}
            <rect x="42" y="60" width="16" height="40" fill="currentColor" />
            <path d="M40 60 L60 60" stroke="currentColor" strokeWidth="2" />
          </>
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {status === 'good' ? (
        /* Hand Open */
        <path 
          d="M30 80 L30 50 L25 45 M35 50 L35 30 M45 50 L45 25 M55 50 L55 30 M65 50 L75 55 M30 80 Q50 90 70 80 L70 50" 
          stroke="currentColor" 
          strokeWidth="4" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      ) : (
        /* Clenched Fist */
        <path 
          d="M35 80 Q35 50 40 50 L60 50 Q65 50 65 80 M40 50 L40 60 M48 50 L48 60 M56 50 L56 60 M64 50 L64 60" 
          stroke="currentColor" 
          strokeWidth="4" 
          fill="none" 
          strokeLinecap="round" 
        />
      )}
    </svg>
  );
};

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, initialType, lang }) => {
  const [activeTab, setActiveTab] = useState<AccessoryType>(initialType);
  const t = translations[lang];

  if (!isOpen) return null;

  const tabs: AccessoryType[] = ['WATCH', 'BRACELET', 'RING'];

  const getContent = (type: AccessoryType) => {
    const key = type === 'RING' ? 'RING' : 'WATCH';
    return { ...t.tutorialContent[key], typeKey: key };
  };

  const content = getContent(activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up flex flex-col resize"
        style={{ 
          width: '600px', 
          height: '700px', 
          maxWidth: '90vw', 
          maxHeight: '90vh',
          minWidth: '320px',
          minHeight: '400px'
        }}
      >
        
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900 p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.tutorialTitle}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.tutorialSubtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-bold tracking-wide uppercase transition-colors
                ${activeTab === tab 
                  ? 'bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-500 border-b-2 border-yellow-500' 
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {t.types[tab]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Good Example */}
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="h-48 bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 p-4">
                <div className="w-full h-full max-w-[200px] flex flex-col items-center">
                  <TutorialIllustration type={content.typeKey as any} status="good" />
                  <span className="text-sm font-bold mt-2 uppercase tracking-widest">{content.goodTitle}</span>
                </div>
              </div>
              <div className="p-5">
                 <h3 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    <span className="bg-green-500 text-white rounded-full p-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {t.doThis}
                 </h3>
                 <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                   {content.good}
                 </p>
              </div>
            </div>

            {/* Bad Example */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="h-48 bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 p-4">
                <div className="w-full h-full max-w-[200px] flex flex-col items-center">
                  <TutorialIllustration type={content.typeKey as any} status="bad" />
                  <span className="text-sm font-bold mt-2 uppercase tracking-widest">{content.badTitle}</span>
                </div>
              </div>
              <div className="p-5">
                 <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                    <span className="bg-red-500 text-white rounded-full p-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </span>
                    {t.dontDoThis}
                 </h3>
                 <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                   {content.bad}
                 </p>
              </div>
            </div>

          </div>
          
          <div className="mt-8 text-center pb-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg"
            >
              {t.gotIt}
            </button>
          </div>
        </div>
        
        {/* Resize Handle Indicator */}
        <div className="absolute bottom-0 right-0 p-1 cursor-se-resize pointer-events-none opacity-50">
           <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15v6h-6" />
           </svg>
        </div>

      </div>
    </div>
  );
};