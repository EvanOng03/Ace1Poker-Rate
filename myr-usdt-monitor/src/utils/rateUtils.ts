import { format, addHours } from 'date-fns';

// Malaysia timezone offset (GMT+8)
const MALAYSIA_OFFSET = 8;

export function getMalaysiaTime(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + MALAYSIA_OFFSET * 3600000);
}

export function formatMalaysiaTime(date: Date = new Date(), formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return format(getMalaysiaTime(date), formatStr);
}

export function getMalaysiaHour(date: Date = new Date()): number {
  return getMalaysiaTime(date).getHours();
}

export function getMalaysiaMinute(date: Date = new Date()): number {
  return getMalaysiaTime(date).getMinutes();
}

// Check if current time is in lock price window (23:20 - 00:30)
export function isLockPriceWindow(date: Date = new Date()): boolean {
  const myTime = getMalaysiaTime(date);
  const hour = myTime.getHours();
  const minute = myTime.getMinutes();

  // 23:20 - 23:59 or 00:00 - 00:30
  if (hour === 23 && minute >= 20) return true;
  if (hour === 0 && minute <= 30) return true;
  return false;
}

// Calculate risk level based on distance to platform rate
export function calculateRiskLevel(
  marketRate: number,
  platformRate: number,
  isLockWindow: boolean,
  consecutiveExpansions: number,
  thresholds: { warning: number; danger: number; critical: number }
): 'safe' | 'warning' | 'danger' | 'critical' {
  // Gap = how much "room" is left between market rate and our platform rate
  const gap = platformRate - marketRate;

  // 1. Critical
  if (gap <= thresholds.critical) return 'critical';
  if (isLockWindow && consecutiveExpansions >= 2 && gap <= thresholds.warning) return 'critical';

  // 2. Danger
  if (gap <= thresholds.danger) return 'danger';

  // 3. Warning
  if (gap <= thresholds.warning) return 'warning';

  return 'safe';
}

// Get risk level color
export function getRiskColor(level: 'safe' | 'warning' | 'danger' | 'critical'): string {
  switch (level) {
    case 'safe': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'danger': return 'text-orange-500';
    case 'critical': return 'text-red-500';
  }
}

export function getRiskBgColor(level: 'safe' | 'warning' | 'danger' | 'critical'): string {
  switch (level) {
    case 'safe': return 'bg-green-500/10 border-green-500/30';
    case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'danger': return 'bg-orange-500/10 border-orange-500/30';
    case 'critical': return 'bg-red-500/10 border-red-500/30';
  }
}

export function getRiskIcon(level: 'safe' | 'warning' | 'danger' | 'critical'): string {
  switch (level) {
    case 'safe': return '✓';
    case 'warning': return '⚠️';
    case 'danger': return '🔴';
    case 'critical': return '🚨';
  }
}

export function getRiskText(level: 'safe' | 'warning' | 'danger' | 'critical'): string {
  switch (level) {
    case 'safe': return '安全';
    case 'warning': return '注意';
    case 'danger': return '危险';
    case 'critical': return '紧急';
  }
}

// Calculate adjusted diff with cost buffer
export function calculateAdjustedDiff(marketRate: number, platformRate: number, costBuffer: number): number {
  return marketRate - platformRate - costBuffer;
}

// Get refresh interval based on time window
export function getRefreshInterval(isLockWindow: boolean): number {
  return isLockWindow ? 30000 : 60000; // 30s vs 60s
}

// Export data to CSV
export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const value = row[h];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
