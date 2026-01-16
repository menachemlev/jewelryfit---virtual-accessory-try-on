
export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  UPSCALING = 'UPSCALING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type AccessoryType = 'WATCH' | 'BRACELET' | 'RING';

export type Finger = 'THUMB' | 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY';

export type RingSize = '53' | '54' | '55' | '56' | '57' | '58' | '59' | '60' | '61' | '62' | '63' | '64' | '65' | '66';

export interface User {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'email';
  credits: number; // "Diamonds"
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  accessoryType: AccessoryType;
  resultImage: string;
  accessoryImage: string;
  isHD?: boolean;
}

export interface RateLimitState {
  timestamps: number[];
  dailyCount: number;
  lastDailyReset: string;
}

export type Language = 'en' | 'he';
