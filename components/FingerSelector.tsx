
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
        {/* SVG Hand - More Realistic Hand Design */}
        <div className="relative w-56 h-64 mb-4">
          <svg viewBox="0 0 200 260" className="w-full h-full drop-shadow-2xl overflow-visible">
            {/* Definitions for shared styles */}
            <defs>
              {/* Shadow filter */}
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

              {/* Gradient for 3D effect */}
              <linearGradient id="fingerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
              </linearGradient>

              {/* Palm gradient */}
              <radialGradient id="palmGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
              </radialGradient>
            </defs>

            {/* Main Palm - More anatomically correct */}
            <path 
              d="M 55 235 
                 C 45 220, 40 180, 45 155 
                 Q 48 140, 52 130
                 L 58 130
                 Q 60 150, 62 155
                 L 90 150
                 Q 95 145, 100 140
                 L 120 142
                 Q 125 147, 130 152
                 L 145 150
                 Q 150 160, 152 175
                 C 157 190, 157 215, 150 235
                 L 140 240
                 Q 120 245, 100 245
                 Q 80 244, 60 240
                 Z" 
              fill="url(#palmGradient)" 
              className="text-gray-100 dark:text-gray-750 transition-colors duration-300"
              stroke="#D1D5DB"
              strokeWidth="1.5"
            />

            {/* Palm lines for realism */}
            <path d="M 60 210 Q 100 215, 140 210" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  opacity="0.15" 
                  className="text-gray-400"
                  fill="none" />
            <path d="M 55 190 Q 100 185, 145 195" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  opacity="0.12" 
                  className="text-gray-400"
                  fill="none" />

            {/* THUMB - More anatomically correct with joints */}
            <g onClick={() => onChange('THUMB')} className="cursor-pointer group">
              {/* Thumb base */}
              <path 
                d="M 58 170 
                   C 50 165, 35 160, 25 150
                   Q 15 140, 12 125
                   Q 10 115, 12 105
                   Q 15 95, 22 92
                   Q 30 90, 37 95
                   Q 42 100, 45 110
                   C 47 120, 50 140, 52 155
                   Q 54 160, 58 165
                   Z" 
                fill={getFingerFill('THUMB')}
                className={selectedFinger === 'THUMB' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-650 transition-colors'}
                stroke={getFingerStroke('THUMB')}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Thumb knuckle */}
              <ellipse cx="30" cy="115" rx="5" ry="3" 
                       fill="currentColor" 
                       opacity={getKnuckleOpacity('THUMB')}
                       transform="rotate(-25 30 115)" />
              {/* Thumbnail hint */}
              <ellipse cx="16" cy="102" rx="4" ry="5" 
                       fill="white" 
                       opacity="0.3"
                       transform="rotate(-20 16 102)" />
              <text x="8" y="85" 
                    className={`text-[10px] font-bold pointer-events-none ${selectedFinger === 'THUMB' ? 'fill-yellow-600 dark:fill-yellow-500' : 'fill-gray-400 dark:fill-gray-500'}`}>
                {lang === 'he' ? 'אגודל' : 'Thumb'}
              </text>
            </g>

            {/* INDEX FINGER - Improved */}
            <g onClick={() => onChange('INDEX')} className="cursor-pointer group">
              <path 
                d="M 60 130
                   Q 58 110, 60 90
                   Q 62 70, 68 55
                   Q 72 45, 78 40
                   Q 82 35, 88 37
                   Q 94 40, 96 48
                   Q 97 58, 95 68
                   Q 92 90, 88 110
                   Q 86 120, 84 130
                   Z" 
                fill={getFingerFill('INDEX')}
                className={selectedFinger === 'INDEX' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-650 transition-colors'}
                stroke={getFingerStroke('INDEX')}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Knuckles */}
              <ellipse cx="70" cy="95" rx="4" ry="2" fill="currentColor" opacity={getKnuckleOpacity('INDEX')} />
              <ellipse cx="75" cy="65" rx="4" ry="2" fill="currentColor" opacity={getKnuckleOpacity('INDEX')} />
              {/* Fingernail */}
              <ellipse cx="85" cy="42" rx="3" ry="4" fill="white" opacity="0.35" />
              <text x="70" y="28" 
                    className={`text-[10px] font-bold pointer-events-none ${selectedFinger === 'INDEX' ? 'fill-yellow-600 dark:fill-yellow-500' : 'fill-gray-400 dark:fill-gray-500'}`}>
                {lang === 'he' ? 'מורה' : 'Index'}
              </text>
            </g>

            {/* MIDDLE FINGER - Longest, Improved */}
            <g onClick={() => onChange('MIDDLE')} className="cursor-pointer group">
              <path 
                d="M 92 140
                   Q 90 115, 92 90
                   Q 94 65, 100 45
                   Q 104 30, 110 22
                   Q 115 15, 122 16
                   Q 129 18, 132 26
                   Q 134 35, 133 45
                   Q 130 70, 126 95
                   Q 123 120, 120 140
                   Z" 
                fill={getFingerFill('MIDDLE')}
                className={selectedFinger === 'MIDDLE' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-650 transition-colors'}
                stroke={getFingerStroke('MIDDLE')}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Knuckles */}
              <ellipse cx="101" cy="85" rx="4" ry="2" fill="currentColor" opacity={getKnuckleOpacity('MIDDLE')} />
              <ellipse cx="106" cy="55" rx="4" ry="2" fill="currentColor" opacity={getKnuckleOpacity('MIDDLE')} />
              {/* Fingernail */}
              <ellipse cx="122" cy="21" rx="3" ry="4" fill="white" opacity="0.35" />
              <text x="110" y="8" 
                    className={`text-[10px] font-bold pointer-events-none ${selectedFinger === 'MIDDLE' ? 'fill-yellow-600 dark:fill-yellow-500' : 'fill-gray-400 dark:fill-gray-500'}`}>
                {lang === 'he' ? 'אמה' : 'Middle'}
              </text>
            </g>

            {/* RING FINGER - Improved */}
            <g onClick={() => onChange('RING')} className="cursor-pointer group">
              <path 
                d="M 122 142
                   Q 120 120, 122 98
                   Q 124 75, 130 55
                   Q 134 40, 140 32
                   Q 144 25, 151 26
                   Q 158 28, 161 36
                   Q 163 45, 162 55
                   Q 159 78, 155 100
                   Q 152 122, 148 142
                   Z" 
                fill={getFingerFill('RING')}
                className={selectedFinger === 'RING' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-650 transition-colors'}
                stroke={getFingerStroke('RING')}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Knuckles */}
              <ellipse cx="131" cy="90" rx="4" ry="2" fill="currentColor" opacity={getKnuckleOpacity('RING')} />
              <ellipse cx="137" cy="62" rx="4" ry="2" fill="currentColor" opacity={getKnuckleOpacity('RING')} />
              {/* Fingernail */}
              <ellipse cx="154" cy="30" rx="3" ry="4" fill="white" opacity="0.35" />
              <text x="150" y="18" 
                    className={`text-[10px] font-bold pointer-events-none ${selectedFinger === 'RING' ? 'fill-yellow-600 dark:fill-yellow-500' : 'fill-gray-400 dark:fill-gray-500'}`}>
                {lang === 'he' ? 'קמיצה' : 'Ring'}
              </text>
            </g>

            {/* PINKY - Improved, smaller */}
            <g onClick={() => onChange('PINKY')} className="cursor-pointer group">
              <path 
                d="M 147 150
                   Q 146 135, 148 120
                   Q 150 105, 155 90
                   Q 159 77, 165 68
                   Q 169 60, 175 58
                   Q 181 57, 185 63
                   Q 188 70, 187 78
                   Q 185 92, 181 106
                   Q 177 125, 173 140
                   Q 170 148, 166 153
                   Z" 
                fill={getFingerFill('PINKY')}
                className={selectedFinger === 'PINKY' ? 'transition-all duration-300' : 'text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-650 transition-colors'}
                stroke={getFingerStroke('PINKY')}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Knuckles */}
              <ellipse cx="158" cy="100" rx="3" ry="2" fill="currentColor" opacity={getKnuckleOpacity('PINKY')} />
              <ellipse cx="167" cy="75" rx="3" ry="2" fill="currentColor" opacity={getKnuckleOpacity('PINKY')} />
              {/* Fingernail */}
              <ellipse cx="181" cy="62" rx="2.5" ry="3.5" fill="white" opacity="0.35" />
              <text x="185" y="55" 
                    className={`text-[10px] font-bold pointer-events-none ${selectedFinger === 'PINKY' ? 'fill-yellow-600 dark:fill-yellow-500' : 'fill-gray-400 dark:fill-gray-500'}`}>
                {lang === 'he' ? 'זרת' : 'Pinky'}
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
