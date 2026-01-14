import React, { useState, useMemo } from 'react';
import { HistoryItem, Language, AccessoryType } from '../types';
import { translations } from '../constants/translations';
import { HistoryComparisonModal } from './HistoryComparisonModal';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  lang: Language;
}

type Tab = 'ALL' | AccessoryType;

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, items, onSelect, lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return items;
    return items.filter(item => item.accessoryType === activeTab);
  }, [items, activeTab]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectedIds.length < 2) {
        setSelectedIds(prev => [...prev, id]);
      }
    }
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      setComparisonModalOpen(true);
    }
  };

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Comparison Modal */}
      <HistoryComparisonModal 
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
        item1={selectedItems[0] || null}
        item2={selectedItems[1] || null}
        lang={lang}
      />

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.historyTitle}</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            <button
               onClick={() => setActiveTab('ALL')}
               className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'ALL' ? 'bg-yellow-500 text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
            >
              {t.all}
            </button>
            {(['WATCH', 'BRACELET', 'RING'] as AccessoryType[]).map(type => (
               <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${activeTab === type ? 'bg-yellow-500 text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
               >
                 {t.types[type]}
               </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <button 
             onClick={() => {
               setIsCompareMode(!isCompareMode);
               setSelectedIds([]);
             }}
             className={`text-xs font-bold flex items-center gap-1 ${isCompareMode ? 'text-yellow-600 dark:text-yellow-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
             {isCompareMode ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  {t.cancel}
                </>
             ) : (
                <>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                   {t.compareMode}
                </>
             )}
          </button>
          
          {isCompareMode && (
             <button
               disabled={selectedIds.length !== 2}
               onClick={handleCompare}
               className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${selectedIds.length === 2 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
             >
               {t.compareAction}
             </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-3 p-4 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <p>{t.noHistory}</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                   if (!isCompareMode) onSelect(item);
                   else {
                      if (selectedIds.includes(item.id)) setSelectedIds(prev => prev.filter(i => i !== item.id));
                      else if (selectedIds.length < 2) setSelectedIds(prev => [...prev, item.id]);
                   }
                }}
                className={`bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer border transition-all relative group
                   ${selectedIds.includes(item.id) 
                      ? 'border-blue-500 ring-2 ring-blue-500/30' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-yellow-500/50'
                   }
                `}
              >
                <div className="flex h-20">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 shrink-0">
                      <img src={item.resultImage} alt="Try-On" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-center">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t.types[item.accessoryType]}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>

                {isCompareMode && (
                   <div className="absolute top-2 right-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/50 border-gray-400'}`}>
                         {selectedIds.includes(item.id) && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                   </div>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-600">{t.localHistory}</p>
        </div>
      </div>
    </>
  );
};