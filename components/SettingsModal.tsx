import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';
import { storageService } from '../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const config = storageService.getFluxConfig();
      setEndpoint(config.endpoint);
      setApiKey(config.apiKey || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    storageService.setFluxConfig(endpoint, apiKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col animate-fade-in-up">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {t.settings}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t.fluxEndpoint}</label>
            <input 
              type="text" 
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.your-proxy.com/flux" 
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Must be accessible from browser (CORS enabled).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t.fluxKey}</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..." 
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all" 
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium text-sm transition-colors">
              {t.cancel}
           </button>
           <button onClick={handleSave} className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg shadow-sm transition-colors text-sm">
              {t.save}
           </button>
        </div>
      </div>
    </div>
  );
};