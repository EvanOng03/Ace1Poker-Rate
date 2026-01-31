import { useEffect, useState, useCallback } from 'react';
import { fetchUSDTMYRRate } from '../services/rateApi';
import { useRateStore } from '../store/rateStore';
import {
  formatMalaysiaTime,
  isLockPriceWindow,
  calculateRiskLevel,
  getRefreshInterval,
} from '../utils/rateUtils';

export function useRateFetcher() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const {
    platformRate,
    setMarketRate,
    addRateRecord,
    consecutiveExpansions,
    incrementExpansions,
    resetExpansions,
    isInitialized,
  } = useRateStore();

  const [previousDiff, setPreviousDiff] = useState<number | null>(null);

  const fetchRate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rate = await fetchUSDTMYRRate();
      setMarketRate(rate);
      setLastFetchTime(new Date());

      const diff = platformRate - rate;
      const isLockWindow = isLockPriceWindow();

      // Track consecutive expansions
      if (previousDiff !== null) {
        if (Math.abs(diff) > Math.abs(previousDiff)) {
          incrementExpansions();
        } else {
          resetExpansions();
        }
      }
      setPreviousDiff(diff);

      const riskLevel = calculateRiskLevel(diff, isLockWindow, consecutiveExpansions);

      // Add to history only when rate has changed (4 decimal places check)
      const currentHistory = useRateStore.getState().rateHistory;
      const lastRecord = currentHistory[currentHistory.length - 1];
      
      const rate4 = Number(rate.toFixed(4));
      const platformRate4 = Number(platformRate.toFixed(4));
      
      const isRateChanged = !lastRecord || Number(lastRecord.marketRate.toFixed(4)) !== rate4;
      const isPlatformChanged = !lastRecord || Number(lastRecord.platformRate.toFixed(4)) !== platformRate4;

      if (isRateChanged || isPlatformChanged) {
        addRateRecord({
          timestamp: Date.now(),
          marketRate: rate,
          platformRate,
          diff,
          riskLevel,
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rate');
    } finally {
      setIsLoading(false);
    }
  }, [platformRate, previousDiff, consecutiveExpansions, setMarketRate, addRateRecord, incrementExpansions, resetExpansions]);

  // Auto refresh
  useEffect(() => {
    if (!isInitialized) return;

    fetchRate(); // Initial fetch

    const setupInterval = () => {
      const isLockWindow = isLockPriceWindow();
      const interval = getRefreshInterval(isLockWindow);
      return setInterval(() => {
        fetchRate();
        // Re-check interval when window changes
      }, interval);
    };

    let intervalId = setupInterval();

    // Check every minute if we need to change refresh rate
    const checkInterval = setInterval(() => {
      clearInterval(intervalId);
      intervalId = setupInterval();
    }, 60000);

    return () => {
      clearInterval(intervalId);
      clearInterval(checkInterval);
    };
  }, [fetchRate, isInitialized]);

  return {
    isLoading,
    error,
    lastFetchTime,
    refetch: fetchRate,
  };
}

export function useCurrentTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    time,
    formattedTime: formatMalaysiaTime(time),
    isLockWindow: isLockPriceWindow(time),
  };
}
