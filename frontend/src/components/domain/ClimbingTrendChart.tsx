import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { channelShort } from '@/lib/channels';
import { toneHex } from '@/lib/severity';
import type { SensorData } from '@/lib/types';

const VIB_PREF = ['vibration_rms_mm_s', 'vibration_peak_mm_s', 'bpfi_amplitude_g'];
const TEMP_PREF = ['bearing_temp_C', 'oil_temp_C'];

function pick(data: SensorData, prefer: string[], unit: string): string | null {
  for (const c of prefer) if (data.channels[c]) return c;
  return Object.keys(data.channels).find((c) => data.channels[c]?.unit === unit) ?? null;
}

export interface ClimbingPair {
  vibKey: string;
  tempKey: string;
}

/**
 * The vibration + temperature channel pair, but only when BOTH are present and a series
 * exists. Returns null otherwise so the caller can skip the chart -- never fabricate a signal.
 */
export function climbingPair(data: SensorData | null | undefined): ClimbingPair | null {
  if (!data?.series?.length) return null;
  const vibKey = pick(data, VIB_PREF, 'mm/s');
  const tempKey = pick(data, TEMP_PREF, '°C');
  return vibKey && tempKey ? { vibKey, tempKey } : null;
}

const VIB_COLOR = toneHex('high'); // orange
const TEMP_COLOR = toneHex('critical'); // red

interface ClimbingTrendChartProps {
  data: SensorData;
  pair: ClimbingPair;
  maxPoints?: number;
  offsetMs?: number;
}

/** Two real signals (vibration mm/s + temperature °C) on a shared time axis, dual Y-scale. */
export function ClimbingTrendChart({ data, pair, maxPoints = 240, offsetMs = 0 }: ClimbingTrendChartProps) {
  const series = data.series ?? [];
  const step = Math.max(1, Math.ceil(series.length / maxPoints));
  const sampled = series.filter((_, i) => i % step === 0);

  const vibUnit = data.channels[pair.vibKey]?.unit ?? '';
  const tempUnit = data.channels[pair.tempKey]?.unit ?? '';
  const vibName = `${channelShort(pair.vibKey)} (${vibUnit})`;
  const tempName = `${channelShort(pair.tempKey)} (${tempUnit})`;
  const shift = (t: string) => new Date(new Date(t).getTime() + offsetMs);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={sampled} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="#EAEEF3" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(t) => shift(t as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          stroke="#94A3B8"
          fontSize={11}
          minTickGap={48}
        />
        <YAxis
          yAxisId="vib"
          stroke={VIB_COLOR}
          fontSize={11}
          width={46}
          label={{ value: vibUnit, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94A3B8' }}
        />
        <YAxis
          yAxisId="temp"
          orientation="right"
          stroke={TEMP_COLOR}
          fontSize={11}
          width={40}
          label={{ value: tempUnit, angle: 90, position: 'insideRight', fontSize: 10, fill: '#94A3B8' }}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DCE2EA' }}
          labelFormatter={(t) => shift(t as string).toLocaleString()}
          formatter={(v: number | string) => (typeof v === 'number' ? v.toFixed(2) : v)}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          yAxisId="vib"
          type="monotone"
          dataKey={pair.vibKey}
          name={vibName}
          stroke={VIB_COLOR}
          dot={false}
          strokeWidth={1.6}
          isAnimationActive={false}
          connectNulls
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey={pair.tempKey}
          name={tempName}
          stroke={TEMP_COLOR}
          dot={false}
          strokeWidth={1.6}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
