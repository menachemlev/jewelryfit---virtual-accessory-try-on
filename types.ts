export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type AccessoryType = 'WATCH' | 'BRACELET' | 'RING';

export type FingerType = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface User {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'facebook' | 'apple';
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  accessoryType: AccessoryType;
  resultImage: string;
  accessoryImage: string; // Added to support comparison
  selectedFinger?: FingerType; // Optional: finger selected for ring
}

export interface RateLimitState {
  timestamps: number[];
  dailyCount: number;
  lastDailyReset: string;
}

export type Language = 'en' | 'he';