import React, { useState } from 'react';
import { AccessoryType, Language } from '../types';
import { translations } from '../constants/translations';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: AccessoryType;
  lang: Language;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, initialType, lang }) => {
  const [activeTab, setActiveTab] = useState<AccessoryType>(initialType);
  const t = translations[lang];

  if (!isOpen) return null;

  const tabs: AccessoryType[] = ['WATCH', 'BRACELET', 'RING'];

  const getContent = (type: AccessoryType) => {
    // Watch and Bracelet share logic for now, or use specific strings if expanded
    const key = type === 'RING' ? 'RING' : 'WATCH';
    return t.tutorialContent[key];
  };

  const content = getContent(activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
      {/* 
        Resizeable Modal Container 
        - 'resize' allows user resizing (requires overflow-hidden/auto)
        - 'flex flex-col' ensures the content area stretches
        - Inline styles set default and min/max dimensions
      */}
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

        {/* Content - Flex-1 to fill remaining height */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 gap-4">
            
            {/* Good Example */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg overflow-hidden flex flex-col sm:flex-row shadow-sm shrink-0">
              <div className="sm:w-1/3 h-32 sm:h-auto relative bg-green-200 dark:bg-green-800">
                <img 
                  src={content.goodImg} 
                  alt="Good Example" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-green-500 text-white p-1 rounded-full shadow-md">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
              <div className="p-4 flex-grow">
                 <h3 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    {t.doThis}
                 </h3>
                 <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                   {content.good}
                 </p>
              </div>
            </div>

            {/* Bad Example */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg overflow-hidden flex flex-col sm:flex-row shadow-sm shrink-0">
              <div className="sm:w-1/3 h-32 sm:h-auto relative bg-red-200 dark:bg-red-800">
                <img 
                  src={content.badImg} 
                  alt="Bad Example" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full shadow-md">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
              </div>
              <div className="p-4 flex-grow">
                 <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                    {t.dontDoThis}
                 </h3>
                 <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                   {content.bad}
                 </p>
              </div>
            </div>

          </div>
          
          <div className="mt-6 text-center">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {t.gotIt}
            </button>
          </div>
        </div>
        
        {/* Resize Handle Indicator (Optional visual cue) */}
        <div className="absolute bottom-0 right-0 p-1 cursor-se-resize pointer-events-none opacity-50">
           <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15v6h-6" />
           </svg>
        </div>

      </div>
    </div>
  );
};