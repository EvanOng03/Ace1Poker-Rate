import { useMemo, useState } from 'react';
import { useRateStore } from '../store/rateStore';
import { format } from 'date-fns';
import { BarChart2, ZoomIn, ZoomOut } from 'lucide-react';

interface DataPoint {
  time: string;
  timestamp: number;
  marketRate: number;
  platformRate: number;
  diff: number;
  isHighRisk: boolean;
}

export function RateChart() {
  const { rateHistory, platformRate } = useRateStore();
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(rateHistory.length / 100));
    return rateHistory
      .filter((_, i) => i % step === 0)
      .map(record => ({
        time: format(new Date(record.timestamp), 'MM-dd HH:mm'),
        timestamp: record.timestamp,
        marketRate: record.marketRate,
        platformRate: record.platformRate,
        diff: record.diff,
        isHighRisk: Math.abs(record.diff) >= 0.05,
      }));
  }, [rateHistory]);

  const { minRate, maxRate, yScale, xScale } = useMemo(() => {
    if (chartData.length === 0) {
      return { minRate: 4.3, maxRate: 4.5, yScale: () => 0, xScale: () => 0 };
    }
    const rates = chartData.flatMap(d => [d.marketRate, d.platformRate]);
    const min = Math.min(...rates) - 0.02;
    const max = Math.max(...rates) + 0.02;
    const chartHeight = 280;
    const chartWidth = 800;

    return {
      minRate: min,
      maxRate: max,
      yScale: (rate: number) => chartHeight - ((rate - min) / (max - min)) * chartHeight,
      xScale: (index: number) => (index / (chartData.length - 1 || 1)) * chartWidth,
    };
  }, [chartData]);

  const marketPath = useMemo(() => {
    if (chartData.length < 2) return '';
    return chartData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.marketRate)}`)
      .join(' ');
  }, [chartData, xScale, yScale]);

  const platformPath = useMemo(() => {
    if (chartData.length < 2) return '';
    return chartData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.platformRate)}`)
      .join(' ');
  }, [chartData, xScale, yScale]);

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">汇率走势图</h2>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-500">
          暂无数据，图表将在监控过程中自动生成
        </div>
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - 50; // account for padding
    const index = Math.round((x / 800) * (chartData.length - 1));

    if (index >= 0 && index < chartData.length) {
      setHoveredPoint(chartData[index]);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-bold text-white">汇率走势图</h2>
      </div>

      <div className="relative overflow-hidden">
        <svg
          viewBox="0 0 900 320"
          className="w-full h-80"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Grid */}
          <g className="text-gray-600">
            {[0, 1, 2, 3, 4].map(i => (
              <g key={i}>
                <line
                  x1="50"
                  y1={56 * i + 20}
                  x2="850"
                  y2={56 * i + 20}
                  stroke="#374151"
                  strokeDasharray="4"
                />
                <text
                  x="45"
                  y={56 * i + 25}
                  fill="#9CA3AF"
                  fontSize="10"
                  textAnchor="end"
                >
                  {(maxRate - (i / 4) * (maxRate - minRate)).toFixed(3)}
                </text>
              </g>
            ))}
          </g>

          {/* Reference Lines */}
          <line
            x1="50"
            y1={yScale(platformRate) + 20}
            x2="850"
            y2={yScale(platformRate) + 20}
            stroke="#3B82F6"
            strokeWidth="1"
            strokeDasharray="5 5"
          />
          <line
            x1="50"
            y1={yScale(platformRate + 0.05) + 20}
            x2="850"
            y2={yScale(platformRate + 0.05) + 20}
            stroke="#EAB308"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="50"
            y1={yScale(platformRate + 0.08) + 20}
            x2="850"
            y2={yScale(platformRate + 0.08) + 20}
            stroke="#F97316"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Chart Area */}
          <g transform="translate(50, 20)">
            {/* Market Rate Line */}
            <path
              d={marketPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
            />

            {/* Platform Rate Line */}
            <path
              d={platformPath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="5 5"
            />

            {/* Data points for interaction */}
            {chartData.map((d, i) => (
              <circle
                key={i}
                cx={xScale(i)}
                cy={yScale(d.marketRate)}
                r="4"
                fill={d.isHighRisk ? '#EF4444' : '#10B981'}
                opacity={hoveredPoint?.timestamp === d.timestamp ? 1 : 0}
              />
            ))}
          </g>

          {/* X Axis Labels */}
          {chartData.length > 0 && [0, Math.floor(chartData.length / 2), chartData.length - 1].map(i => (
            <text
              key={i}
              x={xScale(i) + 50}
              y="310"
              fill="#9CA3AF"
              fontSize="10"
              textAnchor="middle"
            >
              {chartData[i]?.time || ''}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg pointer-events-none z-10"
            style={{
              left: Math.min(tooltipPos.x + 10, 700),
              top: tooltipPos.y - 100,
            }}
          >
            <p className="text-gray-400 text-sm mb-2">{hoveredPoint.time}</p>
            <p className="text-white">
              市场汇率: <span className="font-mono text-green-400">{hoveredPoint.marketRate.toFixed(4)}</span>
            </p>
            <p className="text-white">
              平台汇率: <span className="font-mono text-blue-400">{hoveredPoint.platformRate.toFixed(4)}</span>
            </p>
            <p className="text-white">
              点差: <span className={`font-mono ${hoveredPoint.isHighRisk ? 'text-red-400' : 'text-gray-300'}`}>
                {(hoveredPoint.diff >= 0 ? '+' : '') + hoveredPoint.diff.toFixed(4)}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-400">市场汇率</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-400">平台汇率</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-yellow-500"></div>
          <span className="text-gray-400">警戒线 (+0.05)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-orange-500"></div>
          <span className="text-gray-400">危险线 (+0.08)</span>
        </div>
      </div>
    </div>
  );
}
