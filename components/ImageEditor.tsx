import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (newBase64: string) => void;
  onCancel: () => void;
  lang: Language;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onCancel, lang }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const t = translations[lang];
  
  // Editor State
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load Image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      // Initial scale to fit
      const fitScale = Math.min(400 / img.width, 400 / img.height);
      setScale(fitScale > 1 ? 1 : fitScale);
    };
  }, [imageSrc]);

  // Draw Canvas
  const draw = useCallback(() => {
    if (!canvasRef.current || !image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Output dimensions (Fixed viewport size)
    const cw = canvas.width;
    const ch = canvas.height;

    // Clear
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#000000'; // Fill background black to avoid transparent edges
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();

    // 1. Center Coordinate System
    ctx.translate(cw / 2, ch / 2);

    // 2. Apply Pan (Screen Space)
    ctx.translate(pan.x, pan.y);

    // 3. Apply Rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 4. Apply Scale
    ctx.scale(scale, scale);

    // 5. Apply Filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // 6. Draw Image Centered
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    ctx.restore();
  }, [image, scale, rotation, brightness, contrast, pan]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  // Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      onSave(dataUrl);
    }
  };

  const rotateLeft = () => setRotation(r => r - 90);
  const rotateRight = () => setRotation(r => r + 90);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.editImage}</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-grow bg-[#1a1a1a] flex items-center justify-center p-4 relative overflow-hidden select-none">
          <p className="absolute top-4 left-0 w-full text-center text-xs text-gray-500 pointer-events-none z-10">{t.dragText}</p>
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="border-2 border-yellow-500/50 shadow-2xl cursor-move max-w-full max-h-full"
            style={{ width: '400px', height: '400px' }}
          />
        </div>

        {/* Controls */}
        <div className="p-6 bg-white dark:bg-gray-800 space-y-6 overflow-y-auto">
          
          {/* Zoom & Rotate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.zoomCrop}</label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.rotation}</label>
              <div className="flex gap-2">
                <button onClick={rotateLeft} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors">
                  ↺ -90°
                </button>
                <button onClick={rotateRight} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors">
                  ↻ +90°
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.brightness}</label>
                <span className="text-xs text-gray-400">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.contrast}</label>
                <span className="text-xs text-gray-400">{contrast}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-4">
             <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {t.cancel}
             </button>
             <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-colors">
                {t.apply}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};