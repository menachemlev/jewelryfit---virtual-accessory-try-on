import React from 'react';

interface WatermarkOverlayProps {
  imageUrl: string;
  showWatermark: boolean;
  watermarkText?: string;
}

/**
 * Component that displays an image with an optional heavy watermark overlay
 * Used for free trial images to prove technology without giving away value
 */
export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ 
  imageUrl, 
  showWatermark,
  watermarkText = 'JewelryFit AI • Unlock to Remove'
}) => {
  return (
    <div className="relative w-full h-full">
      {/* Main Image */}
      <img 
        src={imageUrl} 
        alt="Try-on result" 
        className="w-full h-full object-contain rounded-lg"
      />

      {/* Heavy Watermark Overlay (Free Tier) */}
      {showWatermark && (
        <>
          {/* Diagonal Watermarks */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            {/* Multiple repeating watermarks */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotate(-45deg) translateY(${(i - 4) * 150}px)`,
                }}
              >
                <div className="text-white/40 dark:text-white/30 text-3xl md:text-4xl font-bold whitespace-nowrap backdrop-blur-[1px] px-8 py-4 select-none">
                  {watermarkText}
                </div>
              </div>
            ))}
          </div>

          {/* Center Large Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-8 py-6 border-4 border-white/40 shadow-2xl transform -rotate-12 select-none">
              <div className="text-white text-2xl md:text-4xl font-black text-center mb-2">
                🔒 WATERMARKED
              </div>
              <div className="text-white/90 text-sm md:text-base text-center font-medium">
                Unlock to get clean image
              </div>
            </div>
          </div>

          {/* Corner Watermarks */}
          <div className="absolute top-4 left-4 text-white/50 dark:text-white/40 text-xs md:text-sm font-bold select-none">
            JewelryFit AI
          </div>
          <div className="absolute top-4 right-4 text-white/50 dark:text-white/40 text-xs md:text-sm font-bold select-none">
            Free Trial
          </div>
          <div className="absolute bottom-4 left-4 text-white/50 dark:text-white/40 text-xs md:text-sm font-bold select-none">
            jewelryfit.ai
          </div>
          <div className="absolute bottom-4 right-4 text-white/50 dark:text-white/40 text-xs md:text-sm font-bold select-none">
            🔓 Unlock
          </div>
        </>
      )}
    </div>
  );
};
