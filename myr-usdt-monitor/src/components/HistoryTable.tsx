import { useMemo } from 'react';
import { useRateStore, DailyStats } from '../store/rateStore';
import { formatMalaysiaTime, getRiskColor, getRiskBgColor, getRiskText, exportToCSV } from '../utils/rateUtils';
import { format, startOfDay, subDays } from 'date-fns';
import { Calendar, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function HistoryTable() {
  const { rateHistory, platformRate } = useRateStore();

  // Calculate daily stats from history
  const dailyStats = useMemo(() => {
    const statsByDate = new Map<string, DailyStats>();

    // Group records by date
    rateHistory.forEach(record => {
      const dateKey = format(new Date(record.timestamp), 'yyyy-MM-dd');

      if (!statsByDate.has(dateKey)) {
        statsByDate.set(dateKey, {
          date: dateKey,
          maxDiff: record.diff,
          minDiff: record.diff,
          avgDiff: record.diff,
          maxMarketRate: record.marketRate,
          minMarketRate: record.marketRate,
          avgMarketRate: record.marketRate,
          platformRate: record.platformRate,
          riskLevel: record.riskLevel,
          lockTimeRate: undefined,
        });
      } else {
        const stats = statsByDate.get(dateKey)!;
        stats.maxDiff = Math.max(stats.maxDiff, record.diff);
        stats.minDiff = Math.min(stats.minDiff, record.diff);
        stats.maxMarketRate = Math.max(stats.maxMarketRate, record.marketRate);
        stats.minMarketRate = Math.min(stats.minMarketRate, record.marketRate);

        // Check if this is near 23:50
        const hour = new Date(record.timestamp).getHours();
        const minute = new Date(record.timestamp).getMinutes();
        if (hour === 23 && minute >= 45 && minute <= 55) {
          stats.lockTimeRate = record.marketRate;
        }

        // Update risk level to highest seen
        const riskOrder = { safe: 0, warning: 1, danger: 2, critical: 3 };
        if (riskOrder[record.riskLevel] > riskOrder[stats.riskLevel]) {
          stats.riskLevel = record.riskLevel;
        }
      }
    });

    // Calculate averages
    statsByDate.forEach((stats, dateKey) => {
      const dayRecords = rateHistory.filter(r =>
        format(new Date(r.timestamp), 'yyyy-MM-dd') === dateKey
      );
      if (dayRecords.length > 0) {
        stats.avgDiff = dayRecords.reduce((sum, r) => sum + r.diff, 0) / dayRecords.length;
        stats.avgMarketRate = dayRecords.reduce((sum, r) => sum + r.marketRate, 0) / dayRecords.length;
      }
    });

    return Array.from(statsByDate.values()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  }, [rateHistory]);

  const handleExport = () => {
    const exportData = dailyStats.map(stats => ({
      日期: stats.date,
      平台汇率: stats.platformRate.toFixed(4),
      市场最高: stats.maxMarketRate.toFixed(4),
      市场最低: stats.minMarketRate.toFixed(4),
      市场平均: stats.avgMarketRate.toFixed(4),
      最大点差: stats.maxDiff.toFixed(4),
      最小点差: stats.minDiff.toFixed(4),
      平均点差: stats.avgDiff.toFixed(4),
      '锁价参考(23:50)': stats.lockTimeRate?.toFixed(4) || '-',
      风险等级: getRiskText(stats.riskLevel),
    }));
    exportToCSV(exportData, `汇率历史_${format(new Date(), 'yyyyMMdd')}.csv`);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">历史汇率 (最近7天)</h2>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          导出CSV
        </button>
      </div>

      {dailyStats.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          暂无历史数据，数据将在监控过程中自动收集
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">日期</th>
                <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">平台汇率</th>
                <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">市场汇率</th>
                <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">最大点差</th>
                <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">锁价参考</th>
                <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">风险</th>
              </tr>
            </thead>
            <tbody>
              {dailyStats.map((stats, index) => (
                <tr
                  key={stats.date}
                  className={`border-b border-gray-700/50 ${index === 0 ? 'bg-blue-500/5' : ''}`}
                >
                  <td className="px-4 py-4 text-white font-medium">
                    {stats.date}
                    {index === 0 && (
                      <span className="ml-2 text-xs text-blue-400">(今日)</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-blue-400 font-mono">
                    {stats.platformRate.toFixed(4)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-white font-mono">{stats.avgMarketRate.toFixed(4)}</span>
                      <span className="text-gray-500 text-xs">
                        {stats.minMarketRate.toFixed(4)} ~ {stats.maxMarketRate.toFixed(4)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {stats.maxDiff > 0 ? (
                        <TrendingUp className={`w-4 h-4 ${getRiskColor(stats.riskLevel)}`} />
                      ) : stats.maxDiff < 0 ? (
                        <TrendingDown className={`w-4 h-4 ${getRiskColor(stats.riskLevel)}`} />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-500" />
                      )}
                      <span className={`font-mono ${getRiskColor(stats.riskLevel)}`}>
                        {(stats.maxDiff >= 0 ? '+' : '') + stats.maxDiff.toFixed(4)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-gray-300">
                    {stats.lockTimeRate ? stats.lockTimeRate.toFixed(4) : '-'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBgColor(stats.riskLevel)} ${getRiskColor(stats.riskLevel)}`}>
                      {getRiskText(stats.riskLevel)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
