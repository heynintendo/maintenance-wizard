import { Line, LineChart, ResponsiveContainer } from 'recharts';

import { useSensors } from '@/hooks/queries';
import { toneHex } from '@/lib/severity';

const PREF = ['vibration_rms_mm_s', 'vibration_peak_mm_s', 'bpfi_amplitude_g'];

interface AssetSparklineProps {
  equipmentId: string;
  tone?: string; // severity tone for the line colour
  height?: number;
  maxPoints?: number;
}

/**
 * A tiny trend line of an asset's governing channel, from its REAL sensor series. Renders
 * nothing if the asset exposes no series (so it degrades cleanly for un-instrumented assets).
 */
export function AssetSparkline({ equipmentId, tone = 'neutral', height = 32, maxPoints = 60 }: AssetSparklineProps) {
  const sensors = useSensors(equipmentId, true);
  const data = sensors.data;
  if (!data?.series?.length) return null;

  const key = PREF.find((c) => data.channels[c]) ?? Object.keys(data.channels)[0];
  if (!key) return null;

  const step = Math.max(1, Math.ceil(data.series.length / maxPoints));
  const sampled = data.series
    .filter((_, i) => i % step === 0)
    .map((p) => ({ v: typeof p[key] === 'number' ? (p[key] as number) : null }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={sampled} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={toneHex(tone)}
          dot={false}
          strokeWidth={1.4}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
