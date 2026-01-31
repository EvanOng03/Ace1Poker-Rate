import { useMemo } from 'react';
import { useRateStore, DailyStats } from '../store/rateStore';
import { formatMalaysiaTime, getRiskColor, getRiskBgColor, getRiskText, exportToCSV } from '../utils/rateUtils';
import { format, startOfDay, subDays } from 'date-fns';
import { Calendar, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function HistoryTable() {
  const { rateHistory } = useRateStore();

  const displayedHistory = useMemo(() => {
    // Sort by timestamp descending and take top 50
    return [...rateHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  }, [rateHistory]);

  const dailyRanges = useMemo(() => {
    const ranges = new Map<string, { min: number; max: number }>();
    rateHistory.forEach(r => {
      const date = format(new Date(r.timestamp), 'yyyy-MM-dd');
      const current = ranges.get(date) || { min: r.marketRate, max: r.marketRate };
      ranges.set(date, {
        min: Math.min(current.min, r.marketRate),
        max: Math.max(current.max, r.marketRate),
      });
    });
    return ranges;
  }, [rateHistory]);

  const handleExport = () => {
    const exportData = displayedHistory.map(record => {
      const dateKey = format(new Date(record.timestamp), 'yyyy-MM-dd');
      const range = dailyRanges.get(dateKey);
      return {
        日期: formatMalaysiaTime(new Date(record.timestamp), 'yyyy-MM-dd HH:mm:ss') + ' (GMT+8)',
        平台汇率: record.platformRate.toFixed(4),
        当前市场汇率: record.marketRate.toFixed(4),
        '市场范围(最小~最大)': `${range?.min.toFixed(4)} ~ ${range?.max.toFixed(4)}`,
        点差: record.diff.toFixed(4),
        风险等级: getRiskText(record.riskLevel),
      };
    });
    exportToCSV(exportData, `汇率变动历史_${format(new Date(), 'yyyyMMdd')}.csv`);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">历史汇率变动记录</h2>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          导出CSV
        </button>
      </div>

      {displayedHistory.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          暂无历史数据，汇率变动时将自动记录
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">日期 (GMT+8)</th>
                <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">平台汇率</th>
                <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">市场汇率</th>
                <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">点差</th>
                <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">风险</th>
              </tr>
            </thead>
            <tbody>
              {displayedHistory.map((record, index) => {
                const dateKey = format(new Date(record.timestamp), 'yyyy-MM-dd');
                const range = dailyRanges.get(dateKey);
                return (
                  <tr
                    key={record.timestamp + index}
                    className={`border-b border-gray-700/50 ${index === 0 ? 'bg-blue-500/5' : ''}`}
                  >
                    <td className="px-4 py-4 text-white font-medium">
                      {formatMalaysiaTime(new Date(record.timestamp), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-4 py-4 text-right text-blue-400 font-mono">
                      {record.platformRate.toFixed(4)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-white font-mono">{record.marketRate.toFixed(4)}</span>
                        <span className="text-gray-500 text-xs">
                          {range?.min.toFixed(4)} ~ {record.marketRate.toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {record.diff > 0 ? (
                          <TrendingUp className={`w-4 h-4 ${getRiskColor(record.riskLevel)}`} />
                        ) : record.diff < 0 ? (
                          <TrendingDown className={`w-4 h-4 ${getRiskColor(record.riskLevel)}`} />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-500" />
                        )}
                        <span className={`font-mono ${getRiskColor(record.riskLevel)}`}>
                          {(record.diff >= 0 ? '+' : '') + record.diff.toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBgColor(record.riskLevel)} ${getRiskColor(record.riskLevel)}`}>
                        {getRiskText(record.riskLevel)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
