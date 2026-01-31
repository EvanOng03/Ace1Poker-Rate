import { useEffect, useState } from 'react';
import { useRateStore } from '../store/rateStore';
import { calculateRiskLevel, getRiskColor, getRiskBgColor, getRiskText, isLockPriceWindow, formatMalaysiaTime } from '../utils/rateUtils';
import { AlertTriangle, X, Bell, BellOff, Volume2 } from 'lucide-react';

export function AlertBanner() {
  const { marketRate, platformRate, alertDismissed, dismissAlert, resetAlert, consecutiveExpansions } = useRateStore();

  const diff = platformRate - marketRate;
  const isLockWindow = isLockPriceWindow();
  const riskLevel = calculateRiskLevel(diff, isLockWindow, consecutiveExpansions);

  // Reset dismissed state when risk level changes
  useEffect(() => {
    if (riskLevel === 'safe') {
      resetAlert();
    }
  }, [riskLevel, resetAlert]);

  if (riskLevel === 'safe' || alertDismissed || marketRate === 0) {
    return null;
  }

  const bgColor = riskLevel === 'critical' ? 'bg-red-600' :
    riskLevel === 'danger' ? 'bg-orange-600' : 'bg-yellow-600';

  return (
    <div className={`fixed top-0 left-0 right-0 ${bgColor} ${riskLevel === 'critical' ? 'animate-pulse' : ''} z-50`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-white" />
          <span className="text-white font-medium">
            {riskLevel === 'critical' && '🚨 紧急告警: '}
            {riskLevel === 'danger' && '🔴 危险告警: '}
            {riskLevel === 'warning' && '⚠️ 注意告警: '}
            点差 {(diff >= 0 ? '+' : '') + diff.toFixed(4)} MYR
            {isLockWindow && ' (锁价时段)'}
          </span>
        </div>
        <button
          onClick={dismissAlert}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

export function AlertModal() {
  const { marketRate, platformRate, consecutiveExpansions } = useRateStore();
  const [isOpen, setIsOpen] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState(0);

  const diff = platformRate - marketRate;
  const isLockWindow = isLockPriceWindow();
  const riskLevel = calculateRiskLevel(diff, isLockWindow, consecutiveExpansions);

  // Show modal for critical alerts (with cooldown)
  useEffect(() => {
    const now = Date.now();
    if (riskLevel === 'critical' && marketRate > 0 && now - lastAlertTime > 300000) { // 5 min cooldown
      setIsOpen(true);
      setLastAlertTime(now);

      // Play alert sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRkAQKPV3rdmFQA8ktfYvnQfAEqj1tK3XgsAPYnT0cBvFABAoNPOultCBj2G0M6+bBAAPpvQzL5YOgA1ic7LwG4TAD6b0Mu+VjYAMobOy8FvEwA+m9DLvlY2ADKA');
        audio.play().catch(() => { }); // Ignore if audio fails
      } catch { }
    }
  }, [riskLevel, marketRate, lastAlertTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 border-2 border-red-500 animate-pulse">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-red-500 mb-2">🚨 紧急告警</h2>
          <p className="text-gray-300 mb-6">
            汇率点差已达到紧急水平，请立即关注！
          </p>

          <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-gray-400 text-sm">市场汇率</p>
                <p className="text-2xl font-bold text-white">{marketRate.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">平台汇率</p>
                <p className="text-2xl font-bold text-blue-400">{platformRate.toFixed(4)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-600">
              <p className="text-gray-400 text-sm">当前点差</p>
              <p className="text-3xl font-bold text-red-500">
                {(diff >= 0 ? '+' : '') + diff.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-400 mb-6">
            {formatMalaysiaTime()} (GMT+8)
            {isLockWindow && <span className="text-yellow-400 ml-2">• 锁价时段</span>}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
          >
            我已知晓
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationToggle() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setEnabled(permission === 'granted');
    }
  };

  return (
    <button
      onClick={requestPermission}
      className={`p-3 rounded-lg transition-colors ${enabled ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-800 hover:bg-gray-700'}`}
      title={enabled ? '通知已启用' : '启用浏览器通知'}
    >
      {enabled ? (
        <Bell className="w-5 h-5 text-white" />
      ) : (
        <BellOff className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );
}
