import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Diamond */}
    <path d="M6 3H18L21 8L12 17L3 8L6 3Z" strokeWidth="2" />
    <path d="M3 8H21" strokeWidth="1.5" />
    <path d="M12 17L6 3" strokeWidth="1.5" />
    <path d="M12 17L18 3" strokeWidth="1.5" />
    
    {/* Ring Band - carefully positioned to look like it's holding the diamond */}
    <path d="M19.07 13C19.66 14.16 20 15.46 20 16.85C20 20.7 16.4 23.85 12 23.85C7.6 23.85 4 20.7 4 16.85C4 15.46 4.34 14.16 4.93 13" strokeWidth="2" />
  </svg>
);