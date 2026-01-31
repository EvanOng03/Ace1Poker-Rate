import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

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
  isInitialized: boolean;

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
  syncWithSupabase: () => Promise<void>;
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
      isInitialized: false,

      setMarketRate: (rate) => set({ marketRate: rate, lastUpdated: Date.now() }),

      setPlatformRate: async (rate) => {
        set({ platformRate: rate });
        try {
          await supabase.from('app_settings').upsert({ 
            key: 'platform_rate', 
            value: rate.toString() 
          }, { onConflict: 'key' });
        } catch (error) {
          console.error('Failed to sync platform rate:', error);
        }
      },

      setCostBuffer: async (buffer) => {
        set({ costBuffer: buffer });
        try {
          await supabase.from('app_settings').upsert({ 
            key: 'cost_buffer', 
            value: buffer.toString() 
          }, { onConflict: 'key' });
        } catch (error) {
          console.error('Failed to sync cost buffer:', error);
        }
      },

      addRateRecord: async (record) => {
        const history = get().rateHistory;
        // Keep last 7 days (roughly 2000+ records at 5min intervals)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const filtered = history.filter(r => r.timestamp > sevenDaysAgo);
        set({ rateHistory: [...filtered, record] });

        // Push to Supabase
        try {
          await supabase.from('rate_history').insert([{
            timestamp: record.timestamp,
            market_rate: record.marketRate,
            platform_rate: record.platformRate,
            diff: record.diff,
            risk_level: record.riskLevel
          }]);
        } catch (error) {
          console.error('Failed to push to Supabase:', error);
        }
      },

      updateDailyStats: async (stats) => {
        const dailyStats = get().dailyStats;
        const existingIndex = dailyStats.findIndex(s => s.date === stats.date);
        
        let newDailyStats;
        if (existingIndex >= 0) {
          dailyStats[existingIndex] = stats;
          newDailyStats = [...dailyStats];
        } else {
          // Keep last 7 days
          const recent = dailyStats.slice(-6);
          newDailyStats = [...recent, stats];
        }
        set({ dailyStats: newDailyStats });

        // Push to Supabase
        try {
          await supabase.from('daily_stats').upsert({
            date: stats.date,
            max_diff: stats.maxDiff,
            min_diff: stats.minDiff,
            avg_diff: stats.avgDiff,
            max_market_rate: stats.maxMarketRate,
            min_market_rate: stats.minMarketRate,
            avg_market_rate: stats.avgMarketRate,
            platform_rate: stats.platformRate,
            risk_level: stats.riskLevel,
            lock_time_rate: stats.lockTimeRate
          }, { onConflict: 'date' });
        } catch (error) {
          console.error('Failed to push daily stats to Supabase:', error);
        }
      },

      dismissAlert: () => set({ alertDismissed: true }),

      resetAlert: () => set({ alertDismissed: false }),

      incrementExpansions: () => set({ consecutiveExpansions: get().consecutiveExpansions + 1 }),

      resetExpansions: () => set({ consecutiveExpansions: 0 }),

      clearHistory: () => set({ rateHistory: [], dailyStats: [] }),

      syncWithSupabase: async () => {
        try {
          // Fetch settings
          const { data: settingsData } = await supabase.from('app_settings').select('*');
          if (settingsData) {
            const platformRateSetting = settingsData.find(s => s.key === 'platform_rate');
            const costBufferSetting = settingsData.find(s => s.key === 'cost_buffer');
            
            if (platformRateSetting) set({ platformRate: parseFloat(platformRateSetting.value) });
            if (costBufferSetting) set({ costBuffer: parseFloat(costBufferSetting.value) });
          }
          
          // Fetch last 7 days history
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const { data: historyData } = await supabase
            .from('rate_history')
            .select('*')
            .gt('timestamp', sevenDaysAgo)
            .order('timestamp', { ascending: true });

          if (historyData) {
            const history: RateRecord[] = historyData.map(r => ({
              timestamp: Number(r.timestamp),
              marketRate: r.market_rate,
              platformRate: r.platform_rate,
              diff: r.diff,
              riskLevel: r.risk_level
            }));
            set({ rateHistory: history });
          }

          // Fetch daily stats
          const { data: statsData } = await supabase
            .from('daily_stats')
            .select('*')
            .order('date', { ascending: true });

          if (statsData) {
            const stats: DailyStats[] = statsData.map(s => ({
              date: s.date,
              maxDiff: s.max_diff,
              minDiff: s.min_diff,
              avgDiff: s.avg_diff,
              maxMarketRate: s.max_market_rate,
              minMarketRate: s.min_market_rate,
              avgMarketRate: s.avg_market_rate,
              platformRate: s.platform_rate,
              riskLevel: s.risk_level,
              lockTimeRate: s.lock_time_rate
            }));
            set({ dailyStats: stats });
          }

          // ONLY set isInitialized to true after everything is loaded
          set({ isInitialized: true });
        } catch (error) {
          console.error('Supabase sync failed:', error);
        }
      },
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
