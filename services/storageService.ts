import { HistoryItem, RateLimitState, User, Language, AccessoryType } from '../types';

const KEYS = {
  USER: 'chronofit_user',
  HISTORY: 'chronofit_history',
  USAGE: 'chronofit_usage',
  THEME: 'chronofit_theme',
  LANG: 'chronofit_lang',
  FLUX_CONFIG: 'chronofit_flux_config'
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LIMITS = {
  SHORT_WINDOW_MS: 60 * 1000, // 1 minute
  SHORT_MAX: 8, // conservative limit for 1 minute
  DAILY_MAX: 50,
  MAX_ITEMS_PER_CATEGORY: 5
};

// Helper to compress image
const compressImage = (base64: string, maxWidth = 400, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      
      // Scale down keeping aspect ratio
      if (w > maxWidth || h > maxWidth) {
        if (w > h) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        } else {
          w = Math.round((w * maxWidth) / h);
          h = maxWidth;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
          resolve(base64); // Fallback
      }
    };
    img.onerror = () => resolve(base64); // Fallback
  });
};

export const storageService = {
  // Language
  getLanguage: (): Language => {
    return (localStorage.getItem(KEYS.LANG) as Language) || 'en';
  },

  setLanguage: (lang: Language) => {
    localStorage.setItem(KEYS.LANG, lang);
  },

  // Theme
  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'dark';
  },

  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(KEYS.THEME, theme);
  },

  // Flux Config
  getFluxConfig: (): { endpoint: string; apiKey?: string } => {
    const data = localStorage.getItem(KEYS.FLUX_CONFIG);
    return data ? JSON.parse(data) : { endpoint: 'https://api.replicate.com/v1/predictions' };
  },

  setFluxConfig: (endpoint: string, apiKey?: string) => {
    localStorage.setItem(KEYS.FLUX_CONFIG, JSON.stringify({ endpoint, apiKey }));
  },

  // User Auth
  getUser: (): User | null => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: User | null) => {
      if (user) {
        localStorage.setItem(KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(KEYS.USER);
      }
    },
  login: (provider: 'google' | 'facebook' | 'apple'): User => {
    // Check if user exists to preserve credits, otherwise create new
  

    const user: User = {
      id: crypto.randomUUID(),
      name: `Demo User (${provider})`,
      email: `user@${provider}.com`,
      provider,
      credits: 5 // Start with 5 free diamonds
    };
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(KEYS.USER);
  },

  // Credit Management
  deductCredit: async (amount: number = 1): Promise<boolean> => {
    const user = storageService.getUser();
    if (!user) return false;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/credits/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (response.status === 402) {
        // Insufficient credits
        return false;
      }

      if (!response.ok) {
        throw new Error('Failed to deduct credits');
      }

      const data = await response.json();
      
      // Update local user object with new credits
      user.credits = data.credits;
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  },

  addCredits: async (amount: number): Promise<void> => {
    const user = storageService.getUser();
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/credits/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        throw new Error('Failed to add credits');
      }

      const data = await response.json();
      
      // Update local user object with new credits
      user.credits = data.credits;
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  },

  // Fetch current credits from database
  fetchCredits: async (): Promise<number> => {
    const user = storageService.getUser();
    if (!user) return 0;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/credits`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();
      
      // Update local user object with fetched credits
      user.credits = data.credits;
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      
      return data.credits;
    } catch (error) {
      console.error('Error fetching credits:', error);
      return user.credits; // Return cached value on error
    }
  },

  // History
  getHistory: (): HistoryItem[] => {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },

  saveHistoryItem: async (item: HistoryItem) => {
    // Compress images to save space
    const compressedResult = await compressImage(item.resultImage);
    const compressedAccessory = await compressImage(item.accessoryImage);

    const optimizedItem: HistoryItem = {
        ...item,
        resultImage: compressedResult,
        accessoryImage: compressedAccessory
    };

    const current = storageService.getHistory();
    
    // Separate by categories
    const rings = current.filter(i => i.accessoryType === 'RING');
    const watches = current.filter(i => i.accessoryType === 'WATCH');
    const bracelets = current.filter(i => i.accessoryType === 'BRACELET');

    // Add new item to appropriate list
    if (optimizedItem.accessoryType === 'RING') {
      rings.unshift(optimizedItem);
    } else if (optimizedItem.accessoryType === 'WATCH') {
      watches.unshift(optimizedItem);
    } else {
      bracelets.unshift(optimizedItem);
    }

    // Trim lists to limit
    const trimmedRings = rings.slice(0, LIMITS.MAX_ITEMS_PER_CATEGORY);
    const trimmedWatches = watches.slice(0, LIMITS.MAX_ITEMS_PER_CATEGORY);
    const trimmedBracelets = bracelets.slice(0, LIMITS.MAX_ITEMS_PER_CATEGORY);

    // Recombine and sort by timestamp desc
    let updated = [...trimmedWatches, ...trimmedBracelets, ...trimmedRings].sort((a, b) => b.timestamp - a.timestamp);

    // Try saving with smart eviction if quota exceeded
    while (true) {
        try {
            localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
            break; // Success
        } catch (e) {
            if (updated.length === 0) {
                console.error("Storage completely full, cannot save item.");
                break;
            }
            // Remove the oldest item (last in array) and try again
            console.warn("Storage quota exceeded, removing oldest history item to make space.");
            updated.pop();
        }
    }
  },

  // Rate Limiting
  checkRateLimit: (): { allowed: boolean; message?: string } => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    const dataStr = localStorage.getItem(KEYS.USAGE);
    let usage: RateLimitState = dataStr ? JSON.parse(dataStr) : { timestamps: [], dailyCount: 0, lastDailyReset: today };

    // Reset daily if date changed
    if (usage.lastDailyReset !== today) {
      usage = { timestamps: [], dailyCount: 0, lastDailyReset: today };
    }

    // Filter short term window
    usage.timestamps = usage.timestamps.filter(t => now - t < LIMITS.SHORT_WINDOW_MS);

    // Save cleaned up state
    localStorage.setItem(KEYS.USAGE, JSON.stringify(usage));

    if (usage.dailyCount >= LIMITS.DAILY_MAX) {
      return { allowed: false, message: `Daily limit of ${LIMITS.DAILY_MAX} try-ons reached. Please try again tomorrow.` };
    }

    if (usage.timestamps.length >= LIMITS.SHORT_MAX) {
      return { allowed: false, message: `System busy (${LIMITS.SHORT_MAX} tries / min). Please wait a moment.` };
    }

    return { allowed: true };
  },

  recordUsage: () => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const dataStr = localStorage.getItem(KEYS.USAGE);
    let usage: RateLimitState = dataStr ? JSON.parse(dataStr) : { timestamps: [], dailyCount: 0, lastDailyReset: today };

    if (usage.lastDailyReset !== today) {
        usage = { timestamps: [], dailyCount: 0, lastDailyReset: today };
    }

    usage.timestamps.push(now);
    usage.dailyCount += 1;
    localStorage.setItem(KEYS.USAGE, JSON.stringify(usage));
  }
};