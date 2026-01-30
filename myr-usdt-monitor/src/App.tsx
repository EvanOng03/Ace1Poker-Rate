import { useState, useEffect } from 'react';
import { CurrentRateCard } from './components/CurrentRateCard';
import { HistoryTable } from './components/HistoryTable';
import { RateChart } from './components/RateChart';
import { SettingsPanel, SettingsButton } from './components/SettingsPanel';
import { AlertBanner, AlertModal, NotificationToggle } from './components/AlertSystem';
import { useRateFetcher, useCurrentTime } from './hooks/useRateFetcher';
import { useRateStore } from './store/rateStore';
import { Activity, Wifi, WifiOff, Clock, BarChart2, Table } from 'lucide-react';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');
  const { isLoading, error, refetch } = useRateFetcher();
  const { marketRate, platformRate, syncWithSupabase } = useRateStore();
  const { isLockWindow, formattedTime } = useCurrentTime();

  // Initial Supabase sync
  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  // Page title update
  useEffect(() => {
    if (marketRate > 0) {
      const diff = marketRate - platformRate;
      document.title = `MYR ${marketRate.toFixed(4)} | 点差 ${(diff >= 0 ? '+' : '')}${diff.toFixed(4)}`;
    } else {
      document.title = 'MYR/USDT 汇率监控';
    }
  }, [marketRate, platformRate]);

  return (
    <div className={`min-h-screen bg-gray-900 ${isLockWindow ? 'border-t-4 border-yellow-500' : ''}`}>
      {/* Alert Components */}
      <AlertBanner />
      <AlertModal />

      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-xl font-bold text-white">MYR/USDT 汇率监控</h1>
                <p className="text-gray-400 text-sm">实时监控 · 风险告警 · 历史复盘</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${error ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {error ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                <span className="text-sm">{error ? '连接失败' : '已连接'}</span>
              </div>

              {/* Lock Window Indicator */}
              {isLockWindow && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">锁价时段</span>
                </div>
              )}

              <NotificationToggle />
              <SettingsButton onClick={() => setSettingsOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">数据获取失败</p>
                <p className="text-red-400/70 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Current Rate Card */}
        <CurrentRateCard isLoading={isLoading} onRefresh={refetch} />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'chart'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            走势图
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            <Table className="w-4 h-4" />
            历史数据
          </button>
        </div>

        {/* Chart or Table */}
        {activeTab === 'chart' ? <RateChart /> : <HistoryTable />}

        {/* Info Footer */}
        <div className="bg-gray-800/30 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="text-gray-400 font-medium mb-2">点差规则</h3>
              <ul className="text-gray-500 space-y-1">
                <li className="flex items-center gap-2"><span className="text-yellow-400">⚠️</span> ≥0.05: 注意</li>
                <li className="flex items-center gap-2"><span className="text-orange-400">●</span> ≥0.08: 危险</li>
                <li className="flex items-center gap-2"><span className="text-red-400">●</span> ≥0.10: 紧急</li>
              </ul>
            </div>
            <div>
              <h3 className="text-gray-400 font-medium mb-2">锁价时段 (23:20-00:30)</h3>
              <ul className="text-gray-500 space-y-1">
                <li>• |点差| ≥0.04: 黄色警告</li>
                <li>• 连续2次扩张: 红色警告</li>
                <li>• 刷新频率: 每分钟</li>
              </ul>
            </div>
            <div>
              <h3 className="text-gray-400 font-medium mb-2">数据来源</h3>
              <ul className="text-gray-500 space-y-1">
                <li>• CoinGecko API</li>
                <li>• 时区: GMT+8 (马来西亚)</li>
                <li>• 历史保留: 7天</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/30 border-t border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>MYR/USDT 汇率监控系统 v1.0</span>
            <span>当前时间: {formattedTime} (GMT+8)</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
