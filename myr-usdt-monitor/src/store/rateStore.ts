import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RateRecord {
  timestamp: number;
  marketRate: number;
  platformRate: number;
  diff: number;
  riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
}

export interface DailyStats {
  date: string;
  maxDiff: number;
  minDiff: number;
  avgDiff: number;
  maxMarketRate: number;
  minMarketRate: number;
  avgMarketRate: number;
  platformRate: number;
  riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
  lockTimeRate?: number; // 23:50 rate
}

interface RateStore {
  // Current rates
  marketRate: number;
  platformRate: number;
  lastUpdated: number;

  // Settings
  costBuffer: number;

  // History
  rateHistory: RateRecord[];
  dailyStats: DailyStats[];

  // Alert state
  alertDismissed: boolean;
  consecutiveExpansions: number;

  // Actions
  setMarketRate: (rate: number) => void;
  setPlatformRate: (rate: number) => void;
  setCostBuffer: (buffer: number) => void;
  addRateRecord: (record: RateRecord) => void;
  updateDailyStats: (stats: DailyStats) => void;
  dismissAlert: () => void;
  resetAlert: () => void;
  incrementExpansions: () => void;
  resetExpansions: () => void;
  clearHistory: () => void;
}

export const useRateStore = create<RateStore>()(
  persist(
    (set, get) => ({
      marketRate: 0,
      platformRate: 4.35,
      lastUpdated: Date.now(),
      costBuffer: 0.025,
      rateHistory: [],
      dailyStats: [],
      alertDismissed: false,
      consecutiveExpansions: 0,

      setMarketRate: (rate) => set({ marketRate: rate, lastUpdated: Date.now() }),

      setPlatformRate: (rate) => set({ platformRate: rate }),

      setCostBuffer: (buffer) => set({ costBuffer: buffer }),

      addRateRecord: (record) => {
        const history = get().rateHistory;
        // Keep last 7 days (roughly 2000+ records at 5min intervals)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const filtered = history.filter(r => r.timestamp > sevenDaysAgo);
        set({ rateHistory: [...filtered, record] });
      },

      updateDailyStats: (stats) => {
        const dailyStats = get().dailyStats;
        const existingIndex = dailyStats.findIndex(s => s.date === stats.date);
        if (existingIndex >= 0) {
          dailyStats[existingIndex] = stats;
          set({ dailyStats: [...dailyStats] });
        } else {
          // Keep last 7 days
          const recent = dailyStats.slice(-6);
          set({ dailyStats: [...recent, stats] });
        }
      },

      dismissAlert: () => set({ alertDismissed: true }),

      resetAlert: () => set({ alertDismissed: false }),

      incrementExpansions: () => set({ consecutiveExpansions: get().consecutiveExpansions + 1 }),

      resetExpansions: () => set({ consecutiveExpansions: 0 }),

      clearHistory: () => set({ rateHistory: [], dailyStats: [] }),
    }),
    {
      name: 'myr-usdt-rate-store',
      partialize: (state) => ({
        platformRate: state.platformRate,
        costBuffer: state.costBuffer,
        rateHistory: state.rateHistory,
        dailyStats: state.dailyStats,
      }),
    }
  )
);
