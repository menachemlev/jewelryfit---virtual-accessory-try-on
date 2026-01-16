
import React from 'react';
import { Finger, Language } from '../types';
import { translations } from '../constants/translations';

interface FingerSelectorProps {
  selectedFinger: Finger;
  onChange: (finger: Finger) => void;
  lang: Language;
}

export const FingerSelector: React.FC<FingerSelectorProps> = ({ selectedFinger, onChange, lang }) => {
  const t = translations[lang];

  // Colors for selected vs unselected states
  const getFingerFill = (finger: Finger) => selectedFinger === finger ? '#F59E0B' : 'currentColor';
  const getFingerStroke = (finger: Finger) => selectedFinger === finger ? '#B45309' : '#9CA3AF';
  const getKnuckleOpacity = (finger: Finger) => selectedFinger === finger ? '0.6' : '0.2';

  return (
    <div className="mb-6">
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
        {t.selectFinger}
      </label>
      
      <div className="flex flex-col items-center">
        {/* SVG Hand - More Organic Shapes */}
        <div className="relative w-56 h-56 mb-4">
          <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-xl overflow-visible">
            {/* Definitions for shared styles */}
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.2" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Main Palm Base - Skin tone or gray */}
            <path 
              d="M60 220 C 50 200, 45 150, 55 130 C 65 110, 135 110, 145 130 C 155 150, 150 200, 140 220 L 60 220" 
              fill="currentColor" 
              className="text-gray-100 dark:text-gray-750 transition-colors duration-300"
            />

            {/* PINKY */}
            <g onClick={() => onChange('PINKY')} className="cursor-pointer group">
              <path 
                d="M145 135 C 145 135, 148 100, 155 90 C 162 80, 172 85, 172 100 C 172 115, 168 150, 160 165 C 152 180, 145 135, 145 135" 
                fill={getFingerFill('PINKY')}
                className={selectedFinger === 'PINKY' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors'}
                stroke={getFingerStroke('PINKY')}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M154 110 Q160 108, 166 112" fill="none" stroke="currentColor" strokeWidth="1" opacity={getKnuckleOpacity('PINKY')} />
              <text x="175" y="85" className={`text-[9px] font-bold fill-gray-400 dark:fill-gray-500 pointer-events-none ${selectedFinger === 'PINKY' ? 'fill-yellow-600 dark:fill-yellow-500' : ''}`}>
                {lang === 'he' ? '' : 'Pinky'}
              </text>
            </g>

            {/* RING FINGER */}
            <g onClick={() => onChange('RING')} className="cursor-pointer group">
              <path 
                d="M120 120 C 120 120, 120 60, 130 50 C 140 40, 150 50, 150 60 C 150 70, 145 140, 145 140" 
                fill={getFingerFill('RING')}
                className={selectedFinger === 'RING' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors'}
                stroke={getFingerStroke('RING')}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M128 85 Q135 83, 142 85" fill="none" stroke="currentColor" strokeWidth="1" opacity={getKnuckleOpacity('RING')} />
              <text x="140" y="40" className={`text-[9px] font-bold fill-gray-400 dark:fill-gray-500 pointer-events-none ${selectedFinger === 'RING' ? 'fill-yellow-600 dark:fill-yellow-500' : ''}`}>
                {lang === 'he' ? '' : 'Ring'}
              </text>
            </g>

            {/* MIDDLE FINGER */}
            <g onClick={() => onChange('MIDDLE')} className="cursor-pointer group">
              <path 
                d="M90 115 C 90 115, 90 40, 105 30 C 120 20, 125 40, 125 50 C 125 60, 120 135, 120 135" 
                fill={getFingerFill('MIDDLE')}
                className={selectedFinger === 'MIDDLE' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors'}
                stroke={getFingerStroke('MIDDLE')}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M100 70 Q108 68, 116 70" fill="none" stroke="currentColor" strokeWidth="1" opacity={getKnuckleOpacity('MIDDLE')} />
              <text x="95" y="22" className={`text-[9px] font-bold fill-gray-400 dark:fill-gray-500 pointer-events-none ${selectedFinger === 'MIDDLE' ? 'fill-yellow-600 dark:fill-yellow-500' : ''}`}>
                {lang === 'he' ? '' : 'Middle'}
              </text>
            </g>

            {/* INDEX FINGER */}
            <g onClick={() => onChange('INDEX')} className="cursor-pointer group">
              <path 
                d="M58 130 C 58 130, 58 60, 70 50 C 82 40, 92 50, 92 60 C 92 70, 90 140, 90 140" 
                fill={getFingerFill('INDEX')}
                className={selectedFinger === 'INDEX' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors'}
                stroke={getFingerStroke('INDEX')}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M68 85 Q75 83, 82 85" fill="none" stroke="currentColor" strokeWidth="1" opacity={getKnuckleOpacity('INDEX')} />
              <text x="45" y="45" className={`text-[9px] font-bold fill-gray-400 dark:fill-gray-500 pointer-events-none ${selectedFinger === 'INDEX' ? 'fill-yellow-600 dark:fill-yellow-500' : ''}`}>
                {lang === 'he' ? '' : 'Index'}
              </text>
            </g>

            {/* THUMB */}
            <g onClick={() => onChange('THUMB')} className="cursor-pointer group">
              <path 
                d="M58 150 C 40 150, 10 145, 10 120 C 10 105, 25 100, 35 105 C 50 115, 65 135, 65 135" 
                fill={getFingerFill('THUMB')}
                className={selectedFinger === 'THUMB' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors'}
                stroke={getFingerStroke('THUMB')}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M22 122 Q28 116, 35 120" fill="none" stroke="currentColor" strokeWidth="1" opacity={getKnuckleOpacity('THUMB')} transform="rotate(-15, 28, 120)" />
              <text x="5" y="90" className={`text-[9px] font-bold fill-gray-400 dark:fill-gray-500 pointer-events-none ${selectedFinger === 'THUMB' ? 'fill-yellow-600 dark:fill-yellow-500' : ''}`}>
                {lang === 'he' ? '' : 'Thumb'}
              </text>
            </g>
          </svg>
        </div>

        {/* Text Labels Button Group (Fallback/Mobile friendly) */}
        <div className="grid grid-cols-5 gap-1 w-full max-w-sm">
          {(['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'] as Finger[]).map((f) => (
             <button
               key={f}
               onClick={() => onChange(f)}
               className={`py-2 px-1 rounded-lg text-[10px] md:text-xs font-bold transition-all uppercase tracking-tight ${selectedFinger === f ? 'bg-yellow-500 text-black shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
             >
               {t.fingers[f]}
             </button>
          ))}
        </div>
      </div>
    </div>
  );
};
