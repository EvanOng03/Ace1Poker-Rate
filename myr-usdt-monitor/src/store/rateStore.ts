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
  warningThreshold: number;
  dangerThreshold: number;
  criticalThreshold: number;
  usdtPremium: number;

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
  setThresholds: (warning: number, danger: number, critical: number) => void;
  setUsdtPremium: (premium: number) => void;
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
      warningThreshold: 0.05,
      dangerThreshold: 0.08,
      criticalThreshold: 0.10,
      usdtPremium: 0.002, // 0.2%
      rateHistory: [],
      dailyStats: [],
      alertDismissed: false,
      consecutiveExpansions: 0,
      isInitialized: false,

      setMarketRate: (rate) => {
        const currentMarketRate = get().marketRate;
        const premium = get().usdtPremium;
        
        // 1. Apply USDT Premium
        let targetRate = rate * (1 + premium);

        if (currentMarketRate > 0) {
          // 2. Volatility Protection (max 0.3% change per cycle)
          const maxChange = currentMarketRate * 0.003;
          const diff = targetRate - currentMarketRate;
          if (Math.abs(diff) > maxChange) {
            targetRate = currentMarketRate + (diff > 0 ? maxChange : -maxChange);
          }

          // 3. Time Smoothing (XE/Wise Soul: 90% old + 10% new)
          targetRate = (currentMarketRate * 0.9) + (targetRate * 0.1);
        }

        set({ marketRate: targetRate, lastUpdated: Date.now() });
      },

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

      setThresholds: async (warning, danger, critical) => {
        set({ warningThreshold: warning, dangerThreshold: danger, criticalThreshold: critical });
        try {
          await supabase.from('app_settings').upsert([
            { key: 'warning_threshold', value: warning.toString() },
            { key: 'danger_threshold', value: danger.toString() },
            { key: 'critical_threshold', value: critical.toString() }
          ], { onConflict: 'key' });
        } catch (error) {
          console.error('Failed to sync thresholds:', error);
        }
      },

      setUsdtPremium: async (premium) => {
        set({ usdtPremium: premium });
        try {
          await supabase.from('app_settings').upsert({ key: 'usdt_premium', value: premium.toString() }, { onConflict: 'key' });
        } catch (error) {
          console.error('Failed to sync premium:', error);
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
            const warningSetting = settingsData.find(s => s.key === 'warning_threshold');
            const dangerSetting = settingsData.find(s => s.key === 'danger_threshold');
            const criticalSetting = settingsData.find(s => s.key === 'critical_threshold');
            const premiumSetting = settingsData.find(s => s.key === 'usdt_premium');
            
            if (platformRateSetting) set({ platformRate: parseFloat(platformRateSetting.value) });
            if (costBufferSetting) set({ costBuffer: parseFloat(costBufferSetting.value) });
            if (warningSetting) set({ warningThreshold: parseFloat(warningSetting.value) });
            if (dangerSetting) set({ dangerThreshold: parseFloat(dangerSetting.value) });
            if (criticalSetting) set({ criticalThreshold: parseFloat(criticalSetting.value) });
            if (premiumSetting) set({ usdtPremium: parseFloat(premiumSetting.value) });
          }
          
          set({ isInitialized: true });

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
