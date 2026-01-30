import { useRateStore } from '../store/rateStore';
import { useCurrentTime } from '../hooks/useRateFetcher';
import {
  calculateRiskLevel,
  getRiskColor,
  getRiskBgColor,
  getRiskText,
  calculateAdjustedDiff,
  isLockPriceWindow,
} from '../utils/rateUtils';
import { RefreshCw, Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface CurrentRateCardProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export function CurrentRateCard({ isLoading, onRefresh }: CurrentRateCardProps) {
  const { marketRate, platformRate, costBuffer, consecutiveExpansions, lastUpdated } = useRateStore();
  const { formattedTime, isLockWindow } = useCurrentTime();

  const diff = marketRate - platformRate;
  const adjustedDiff = calculateAdjustedDiff(marketRate, platformRate, costBuffer);
  const riskLevel = calculateRiskLevel(diff, isLockWindow, consecutiveExpansions);

  const riskColorClass = getRiskColor(riskLevel);
  const riskBgClass = getRiskBgColor(riskLevel);

  return (
    <div className={`rounded-xl border-2 p-6 ${riskBgClass} ${riskLevel === 'critical' ? 'animate-pulse' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300">{formattedTime}</span>
          {isLockWindow && (
            <span className="px-2 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              锁价时段
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Rate Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Market Rate */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">市场汇率</p>
          <p className="text-4xl font-bold text-white">
            {marketRate > 0 ? marketRate.toFixed(4) : '--'}
          </p>
          <p className="text-gray-500 text-xs mt-1">1 USDT = ? MYR</p>
        </div>

        {/* Platform Rate */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">平台汇率</p>
          <p className="text-4xl font-bold text-blue-400">
            {platformRate.toFixed(4)}
          </p>
          <p className="text-gray-500 text-xs mt-1">当日锁定</p>
        </div>

        {/* Diff */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">点差</p>
          <div className="flex items-center justify-center gap-2">
            {diff >= 0 ? (
              <TrendingUp className={`w-6 h-6 ${riskColorClass}`} />
            ) : (
              <TrendingDown className={`w-6 h-6 ${riskColorClass}`} />
            )}
            <p className={`text-4xl font-bold ${riskColorClass}`}>
              {marketRate > 0 ? (diff >= 0 ? '+' : '') + diff.toFixed(4) : '--'}
            </p>
          </div>
          <p className="text-gray-500 text-xs mt-1">市场 - 平台</p>
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <div className={`px-4 py-2 rounded-full ${riskBgClass} border`}>
          <span className={`font-semibold ${riskColorClass}`}>
            风险等级: {getRiskText(riskLevel)}
          </span>
        </div>
        {costBuffer > 0 && (
          <div className="text-gray-400 text-sm">
            实际风险点差: <span className={diff - costBuffer >= 0.05 ? 'text-yellow-400' : 'text-gray-300'}>
              {(adjustedDiff >= 0 ? '+' : '') + adjustedDiff.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-center text-gray-500 text-xs">
        上次更新: {new Date(lastUpdated).toLocaleTimeString('zh-CN')}
        {isLockWindow && <span className="ml-2 text-yellow-400">• 高频刷新模式 (1分钟)</span>}
      </div>
    </div>
  );
}
