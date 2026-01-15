import { HistoryItem, RateLimitState, User, Language, AccessoryType } from '../types';

const KEYS = {
  USER: 'chronofit_user',
  HISTORY: 'chronofit_history',
  USAGE: 'chronofit_usage',
  THEME: 'chronofit_theme',
  LANG: 'chronofit_lang'
};

const LIMITS = {
  SHORT_WINDOW_MS: 60 * 1000, // 1 minute
  SHORT_MAX: 8, // conservative limit for 1 minute
  DAILY_MAX: 50,
  MAX_ITEMS_PER_CATEGORY: 5
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

  setUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.USER);
    }
  },

  login: (provider: 'google' | 'facebook' | 'apple'): User => {
    // Legacy support - will be replaced by real auth
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
      
      // Separate by categories
      const rings = current.filter(i => i.accessoryType === 'RING');
      const watches = current.filter(i => i.accessoryType === 'WATCH');
      const bracelets = current.filter(i => i.accessoryType === 'BRACELET');

      // Add new item to appropriate list
      if (item.accessoryType === 'RING') {
        rings.unshift(item);
      } else if (item.accessoryType === 'WATCH') {
        watches.unshift(item);
      } else {
        bracelets.unshift(item);
      }

      // Trim lists to limit
      const trimmedRings = rings.slice(0, LIMITS.MAX_ITEMS_PER_CATEGORY);
      const trimmedWatches = watches.slice(0, LIMITS.MAX_ITEMS_PER_CATEGORY);
      const trimmedBracelets = bracelets.slice(0, LIMITS.MAX_ITEMS_PER_CATEGORY);

      // Recombine and sort by timestamp desc
      const updated = [...trimmedWatches, ...trimmedBracelets, ...trimmedRings].sort((a, b) => b.timestamp - a.timestamp);

      localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage quota exceeded, could not save history item.");
      // Fallback: Delete oldest items regardless of category to make space
      try {
        const current = storageService.getHistory();
        if (current.length > 0) {
            const reduced = current.slice(0, current.length - 2); // Remove last 2
            reduced.unshift(item);
            localStorage.setItem(KEYS.HISTORY, JSON.stringify(reduced));
        }
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