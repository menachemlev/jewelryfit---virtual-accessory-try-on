import React, { useState, useEffect } from 'react';
import { Language, AccessoryType } from '../types';

interface JewelryReviewProps {
  resultImage: string | null;
  language: Language;
  accessoryType: AccessoryType;
}

export const JewelryReview: React.FC<JewelryReviewProps> = ({ 
  resultImage, 
  language, 
  accessoryType 
}) => {
  const [review, setReview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (resultImage) {
      generateReview();
    } else {
      setReview('');
      setError(false);
    }
  }, [resultImage, language, accessoryType]);

  const generateReview = async () => {
    setLoading(true);
    setError(false);
    
    try {
      const response = await fetch('/api/analyze-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: resultImage, 
          language,
          accessoryType 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate review');
      }
      
      const data = await response.json();
      setReview(data.review);
    } catch (err) {
      console.error('Error generating review:', err);
      setError(true);
      setReview(language === 'he' 
        ? 'שגיאה ביצירת ביקורת' 
        : 'Error generating review'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!resultImage) return null;

  const title = language === 'he' ? '🤖 ביקורת AI' : '🤖 AI Review';
  const loadingText = language === 'he' ? 'מייצר ביקורת...' : 'Generating review...';

  return (
    <div 
      className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-gray-800/80 dark:to-gray-900/80 rounded-xl border border-yellow-200 dark:border-yellow-900/30 shadow-sm transition-colors duration-300"
      style={{ direction: language === 'he' ? 'rtl' : 'ltr' }}
    >
      <h3 className="text-sm font-bold text-gray-800 dark:text-yellow-400 mb-2 flex items-center gap-2">
        <span>{title}</span>
        {loading && (
          <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        )}
      </h3>
      
      {loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 animate-pulse italic">
          {loadingText}
        </p>
      ) : (
        <p 
          className={`text-sm leading-relaxed ${
            error 
              ? 'text-red-600 dark:text-red-400 italic' 
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {review}
        </p>
      )}
    </div>
  );
};
