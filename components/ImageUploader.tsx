import React, { useCallback } from 'react';
import { ImageState } from '../types';

interface ImageUploaderProps {
  label: string;
  imageState: ImageState;
  onImageChange: (state: ImageState) => void;
  onEdit?: () => void;
  id: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, imageState, onImageChange, onEdit, id }) => {
  
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

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{label}</label>
      
      {!imageState.previewUrl ? (
        <label 
          htmlFor={id} 
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group 
            bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-yellow-500/50 
            dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-10 h-10 mb-3 text-gray-400 group-hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
              <span className="font-semibold">Click to upload</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">PNG, JPG or WEBP</p>
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
        <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 group bg-gray-50 dark:bg-gray-800">
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
              Edit
            </button>
            <button 
              onClick={handleRemove}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg transform scale-95 group-hover:scale-100 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};