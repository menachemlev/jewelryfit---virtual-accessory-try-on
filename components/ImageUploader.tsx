import React, { useCallback } from 'react';
import { ImageState, Language } from '../types';
import { translations } from '../constants/translations';

export interface ValidationState {
  status: 'idle' | 'analyzing' | 'valid' | 'invalid';
  message?: string;
}

interface ImageUploaderProps {
  label: string;
  imageState: ImageState;
  onImageChange: (state: ImageState) => void;
  onEdit?: () => void;
  id: string;
  lang: Language;
  validation?: ValidationState;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, imageState, onImageChange, onEdit, id, lang, validation }) => {
  const t = translations[lang];
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange({
          file: file,
          previewUrl: URL.createObjectURL(file),
          base64: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }, [onImageChange]);

  const handleRemove = useCallback(() => {
    onImageChange({ file: null, previewUrl: null, base64: null });
  }, [onImageChange]);

  // Determine border and status styles
  let borderClass = "border-gray-300 dark:border-gray-700 hover:border-yellow-500/50";
  let statusIcon = null;
  
  if (validation) {
    if (validation.status === 'valid') {
      borderClass = "border-green-500 ring-2 ring-green-500/20";
      statusIcon = (
        <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-md z-10 flex items-center gap-1 px-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          {validation.message && <span className="text-[10px] font-bold">{validation.message}</span>}
        </div>
      );
    } else if (validation.status === 'invalid') {
      borderClass = "border-red-500 ring-2 ring-red-500/20";
      statusIcon = (
        <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md z-10 flex items-center gap-1 px-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          {validation.message && <span className="text-[10px] font-bold">{validation.message}</span>}
        </div>
      );
    } else if (validation.status === 'analyzing') {
       borderClass = "border-blue-400 animate-pulse";
       statusIcon = (
        <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-md z-10 flex items-center gap-1 px-2">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold">{t.analyzing}</span>
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider flex justify-between">
        {label}
      </label>
      
      {!imageState.previewUrl ? (
        <label 
          htmlFor={id} 
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group 
            bg-gray-50 hover:bg-gray-100 
            dark:bg-gray-800 dark:hover:bg-gray-750 ${borderClass}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-10 h-10 mb-3 text-gray-400 group-hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
              <span className="font-semibold">{t.clickUpload}</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.formats}</p>
          </div>
          <input 
            id={id} 
            type="file" 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className={`relative w-full h-64 rounded-xl overflow-hidden border-2 group bg-gray-50 dark:bg-gray-800 transition-colors ${borderClass}`}>
          {statusIcon}
          <img 
            src={imageState.previewUrl} 
            alt="Preview" 
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button 
              onClick={onEdit}
              className="bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg transform scale-95 group-hover:scale-100 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              {t.edit}
            </button>
            <button 
              onClick={handleRemove}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg transform scale-95 group-hover:scale-100 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              {t.remove}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};