import { cn } from '@/lib/cn';
import { severityStyle } from '@/lib/severity';

interface AnomalyGaugeProps {
  score: number;
  threshold: number;
  severity?: string;
}

/**
 * Anomaly score against its alarm threshold. The range is huge (an acute score can be ~24x
 * the alarm gate), so a naive linear bar would just peg at max -- we use a LOG axis instead,
 * mark the alarm threshold, and annotate the exact multiple. Real values only.
 */
export function AnomalyGauge({ score, threshold, severity = 'critical' }: AnomalyGaugeProps) {
  if (!(score > 0) || !(threshold > 0)) return null;

  // Log axis up to the next power of ten above the score (with headroom over the threshold),
  // so both the small alarm gate and a massive exceedance are legible on one bar.
  const axisMax = Math.pow(10, Math.ceil(Math.log10(Math.max(score, threshold * 4))));
  const pos = (v: number) =>
    Math.max(0, Math.min(1, Math.log10(Math.max(v, 1)) / Math.log10(axisMax)));
  const fillPct = pos(score) * 100;
  const markPct = pos(threshold) * 100;
  const ratio = score / threshold;
  const fill = severityStyle(severity).dot; // solid severity colour (e.g. bg-red-500)

  return (
    <div className="mt-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-canvas" aria-hidden>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full', fill)}
          style={{ width: `${fillPct}%` }}
        />
        {/* alarm-threshold marker */}
        <div className="absolute inset-y-0 w-px bg-ink-subtle" style={{ left: `${markPct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-ink-subtle">
        <span className="font-semibold tabular-nums text-ink-secondary">{score.toFixed(1)}</span> vs
        alarm ≥ {threshold} · ~{ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}× threshold
        <span className="text-ink-subtle"> (log scale)</span>
      </p>
    </div>
  );
}
