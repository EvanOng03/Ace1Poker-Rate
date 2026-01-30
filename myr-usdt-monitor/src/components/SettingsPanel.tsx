import { useState } from 'react';
import { useRateStore } from '../store/rateStore';
import { Settings, Save, X } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { platformRate, costBuffer, setPlatformRate, setCostBuffer } = useRateStore();

  const [tempPlatformRate, setTempPlatformRate] = useState(platformRate.toString());
  const [tempCostBuffer, setTempCostBuffer] = useState(costBuffer.toString());

  const handleSave = () => {
    const newRate = parseFloat(tempPlatformRate);
    const newBuffer = parseFloat(tempCostBuffer);

    if (!isNaN(newRate) && newRate > 0) {
      setPlatformRate(newRate);
    }
    if (!isNaN(newBuffer) && newBuffer >= 0) {
      setCostBuffer(newBuffer);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Platform Rate */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              平台汇率 (当日锁定)
            </label>
            <input
              type="number"
              step="0.0001"
              value={tempPlatformRate}
              onChange={(e) => setTempPlatformRate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="例如: 4.3500"
            />
            <p className="text-gray-500 text-xs mt-1">
              当前值: {platformRate.toFixed(4)} MYR
            </p>
          </div>

          {/* Cost Buffer */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              成本缓冲 (USDT采购成本)
            </label>
            <input
              type="number"
              step="0.001"
              value={tempCostBuffer}
              onChange={(e) => setTempCostBuffer(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="例如: 0.025"
            />
            <p className="text-gray-500 text-xs mt-1">
              建议范围: 0.02 ~ 0.03 MYR
            </p>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-blue-400 text-sm">
              💡 平台汇率在每日 00:00 锁定，用于与市场汇率对比计算点差。
              成本缓冲用于计算实际风险点差。
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
    >
      <Settings className="w-5 h-5 text-gray-400" />
    </button>
  );
}
