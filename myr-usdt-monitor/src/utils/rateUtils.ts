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

// Calculate risk level based on diff and time window
export function calculateRiskLevel(
  diff: number,
  isLockWindow: boolean = false,
  consecutiveExpansions: number = 0
): 'safe' | 'warning' | 'danger' | 'critical' {
  // Diff is (Platform - Market). Risk increases as diff becomes more negative.
  // We use the absolute value for thresholds if they represent the "spread" size.
  // However, the user wants "Platform - Market", so let's look at the gap.
  const spread = diff; // Platform - Market
  const absSpread = Math.abs(spread);

  // Critical: spread <= -0.08 OR (lock window + consecutive expansions >= 2)
  if (absSpread >= 0.08) return 'critical';
  if (isLockWindow && consecutiveExpansions >= 2 && absSpread >= 0.04) return 'critical';

  // Danger: spread <= -0.06
  if (absSpread >= 0.06) return 'danger';

  // Warning: spread <= -0.05 OR (lock window + diff <= -0.04)
  if (absSpread >= 0.05) return 'warning';
  if (isLockWindow && absSpread >= 0.04) return 'warning';

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
  return platformRate - marketRate - costBuffer;
}

// Get refresh interval based on time window
export function getRefreshInterval(isLockWindow: boolean): number {
  return 10000; // Fixed to 10 seconds
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
