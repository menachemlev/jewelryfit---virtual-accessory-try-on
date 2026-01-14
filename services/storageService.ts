import { HistoryItem, RateLimitState, User, Language } from '../types';

const KEYS = {
  USER: 'chronofit_user',
  HISTORY: 'chronofit_history',
  USAGE: 'chronofit_usage',
  THEME: 'chronofit_theme',
  LANG: 'chronofit_lang'
};

const LIMITS = {
  SHORT_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  SHORT_MAX: 10,
  DAILY_MAX: 25,
  MAX_HISTORY_ITEMS: 5 // Limit to prevent localStorage quota exceeded
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

  // User Auth
  getUser: (): User | null => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  login: (provider: 'google' | 'facebook' | 'apple'): User => {
    // Simulate a user based on provider
    const user: User = {
      id: crypto.randomUUID(),
      name: `Demo User (${provider})`,
      email: `user@${provider}.com`,
      provider
    };
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(KEYS.USER);
    // Optional: Clear history on logout? keeping it for now.
  },

  // History
  getHistory: (): HistoryItem[] => {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },

  saveHistoryItem: (item: HistoryItem) => {
    try {
      const current = storageService.getHistory();
      const updated = [item, ...current].slice(0, LIMITS.MAX_HISTORY_ITEMS);
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage quota exceeded, could not save history item.");
      // Try to save just the newest one if full list fails
      try {
        localStorage.setItem(KEYS.HISTORY, JSON.stringify([item]));
      } catch (e2) {
        console.error("Critical storage failure");
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
      return { allowed: false, message: `Rate limit exceeded (${LIMITS.SHORT_MAX} tries / 5 mins). Please wait a moment.` };
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