import React from 'react';
import { RingSize, Language } from '../types';
import { translations } from '../constants/translations';

interface RingSizeSelectorProps {
  selectedSize: RingSize;
  onChange: (size: RingSize) => void;
  lang: Language;
}

export const RingSizeSelector: React.FC<RingSizeSelectorProps> = ({ selectedSize, onChange, lang }) => {
  const t = translations[lang];
  
  const sizes: RingSize[] = ['53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66'];

  return (
    <div className="mb-4">
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
        {t.selectRingSize}
      </label>
      <div className="grid grid-cols-7 gap-2 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => onChange(size)}
            className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
              selectedSize === size
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {t.ringSizeInfo}
      </p>
    </div>
  );
};
