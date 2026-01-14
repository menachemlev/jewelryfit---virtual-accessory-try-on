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
}

export interface RateLimitState {
  timestamps: number[];
  dailyCount: number;
  lastDailyReset: string;
}