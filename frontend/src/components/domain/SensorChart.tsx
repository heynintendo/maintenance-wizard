import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { channelLabel } from '@/lib/channels';
import type { SensorData } from '@/lib/types';

interface SensorChartProps {
  data: SensorData;
  channel: string;
  maxPoints?: number;
  offsetMs?: number;
}

// One channel at a time (units differ across channels). The series is downsampled before
// rendering to keep the chart fast, and the x-axis is anchored to the present (offsetMs) so
// it reads as recent alongside the rest of the UI.
export function SensorChart({ data, channel, maxPoints = 300, offsetMs = 0 }: SensorChartProps) {
  const series = data.series ?? [];
  const step = Math.max(1, Math.ceil(series.length / maxPoints));
  const sampled = series
    .filter((_, i) => i % step === 0)
    .map((p) => ({ t: p.timestamp, v: typeof p[channel] === 'number' ? (p[channel] as number) : null }));

  const unit = data.channels[channel]?.unit ?? '';
  const iso = data.iso_thresholds_mm_s;
  const showIso = unit === 'mm/s' && !!iso;
  const shift = (t: string) => new Date(new Date(t).getTime() + offsetMs);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={sampled} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="#EAEEF3" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(t) => shift(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          stroke="#94A3B8"
          fontSize={11}
          minTickGap={48}
        />
        <YAxis stroke="#94A3B8" fontSize={11} width={46} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DCE2EA' }}
          labelFormatter={(t) => shift(t as string).toLocaleString()}
          formatter={(v: number | string) => [
            `${typeof v === 'number' ? v.toFixed(2) : v} ${unit}`.trim(),
            channelLabel(channel),
          ]}
        />
        {showIso && iso && (
          <ReferenceLine y={iso.alert} stroke="#F79009" strokeDasharray="4 4" strokeWidth={1} />
        )}
        {showIso && iso && (
          <ReferenceLine y={iso.action} stroke="#D92D20" strokeDasharray="4 4" strokeWidth={1} />
        )}
        <Line
          type="monotone"
          dataKey="v"
          stroke="#3D79BB"
          dot={false}
          strokeWidth={1.6}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
