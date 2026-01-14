import React from 'react';
import { HistoryItem, Language } from '../types';
import { translations } from '../constants/translations';

interface HistoryComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  item1: HistoryItem | null;
  item2: HistoryItem | null;
  lang: Language;
}

export const HistoryComparisonModal: React.FC<HistoryComparisonModalProps> = ({ isOpen, onClose, item1, item2, lang }) => {
  const t = translations[lang];

  if (!isOpen || !item1 || !item2) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.compareAction}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100 dark:bg-gray-900/50">
          <div className="grid grid-cols-2 gap-4 md:gap-8 h-full">
            
            {/* Item 1 Column */}
            <div className="flex flex-col gap-4 h-full">
               {/* Metadata Card */}
               <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                  <span className="font-bold text-gray-900 dark:text-white">{t.types[item1.accessoryType]} 1</span>
                  <span className="text-xs text-gray-500">{new Date(item1.timestamp).toLocaleDateString()}</span>
               </div>
               
               {/* Image Stack */}
               <div className="flex-1 flex flex-col gap-2 min-h-0">
                  {/* Accessory Source */}
                  <div className="h-1/3 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 relative group">
                     <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-sm z-10">
                        {t.item}
                     </div>
                     <img src={item1.accessoryImage} alt="Item 1" className="w-full h-full object-contain p-2" />
                  </div>
                  {/* Try-On Result */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 relative">
                     <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm z-10">
                        {t.tryOn}
                     </div>
                     <img src={item1.resultImage} alt="Result 1" className="w-full h-full object-contain bg-gray-100 dark:bg-gray-900" />
                  </div>
               </div>
            </div>

            {/* Item 2 Column */}
            <div className="flex flex-col gap-4 h-full">
               {/* Metadata Card */}
               <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                  <span className="font-bold text-gray-900 dark:text-white">{t.types[item2.accessoryType]} 2</span>
                  <span className="text-xs text-gray-500">{new Date(item2.timestamp).toLocaleDateString()}</span>
               </div>
               
               {/* Image Stack */}
               <div className="flex-1 flex flex-col gap-2 min-h-0">
                  {/* Accessory Source */}
                  <div className="h-1/3 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 relative group">
                     <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-sm z-10">
                        {t.item}
                     </div>
                     <img src={item2.accessoryImage} alt="Item 2" className="w-full h-full object-contain p-2" />
                  </div>
                  {/* Try-On Result */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 relative">
                     <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm z-10">
                        {t.tryOn}
                     </div>
                     <img src={item2.resultImage} alt="Result 2" className="w-full h-full object-contain bg-gray-100 dark:bg-gray-900" />
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};