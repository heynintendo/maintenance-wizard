import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ArrowRight, Loader2, Radar, RotateCcw } from 'lucide-react';

import { useAuth } from '@/auth/AuthContext';
import { canDo } from '@/auth/roles';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MarkdownView,
  Select,
  SeverityBadge,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useResetProactive } from '@/hooks/mutations';
import { useProactiveState, useTicket } from '@/hooks/queries';
import { useProactiveStream } from '@/hooks/useProactiveStream';
import { relativeTime } from '@/lib/format';
import { primeAudio } from '@/lib/sound';

import { TraceList } from './TraceList';

const SCENARIOS = [
  {
    label: 'F2 work-roll bearing: acute alarm',
    equipment_id: 'HSM-F2-WRB',
    advance_to: '2026-06-02T12:00:00',
  },
  {
    label: 'F3 main drive gearbox: predictive advisory',
    equipment_id: 'HSM-F3-GBX',
    advance_to: '2026-06-06T06:00:00',
  },
];

export function ProactiveTrigger() {
  const { user } = useAuth();
  const stream = useProactiveStream();
  const proactive = useProactiveState();
  const reset = useResetProactive();
  const { toast } = useToast();
  const [idx, setIdx] = useState(0);

  const traceEndRef = useRef<HTMLDivElement>(null);
  const diagnosisRef = useRef<HTMLDivElement>(null);

  const outcome = stream.final?.outcomes[0] ?? null;
  const finalAlert = outcome ? stream.final?.alerts.find((a) => a.alert_id === outcome.alert_id) : null;
  const ticket = useTicket(outcome?.ticket_id ?? '');

  // Keep the latest output in view: follow the steps while streaming, then anchor
  // on the diagnosis once it arrives.
  useEffect(() => {
    if (stream.streaming) traceEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [stream.trace, stream.streaming]);
  useEffect(() => {
    if (outcome) diagnosisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [outcome]);

  if (!canDo(user?.role, 'run_proactive')) return null;

  function run() {
    const sc = SCENARIOS[idx];
    primeAudio(); // unlock the alert tone on this user gesture
    stream.run({ advance_to: sc.advance_to, equipment_id: sc.equipment_id });
  }

  const noOutcome = stream.final && stream.final.outcomes.length === 0 && !stream.streaming;
  const hasActivity = stream.streaming || stream.trace.length > 0 || !!stream.final;
  const assets = proactive.data?.monitored_assets ?? [];

  return (
    <section className="space-y-4">
      {/* Compact control bar -- selector + actions, with the monitoring strip inline. */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-hairline bg-surface p-3 shadow-card">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Scenario</label>
          <Select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="w-full">
            {SCENARIOS.map((s, i) => (
              <option key={s.equipment_id} value={i}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={run} loading={stream.streaming}>
          <Radar className="h-4 w-4" /> Run proactive scan
        </Button>
        <Button
          variant="secondary"
          onClick={() => reset.mutate(undefined, { onSuccess: () => toast('Proactive state reset', 'success') })}
          loading={reset.isPending}
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 self-center text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Radar className="h-3.5 w-3.5 text-brand-500" />
            Last scan: {proactive.data?.last_polled_at ? relativeTime(proactive.data.last_polled_at) : 'no scans yet'}
          </span>
          <span className="text-ink-subtle">
            {assets.length} asset{assets.length === 1 ? '' : 's'} monitored
            {assets.length > 0 && <span className="ml-1 font-mono">({assets.join(', ')})</span>}
          </span>
        </div>
      </div>

      {/* Main, full-width live scan: the centerpiece of the demo. */}
      {!hasActivity ? (
        <EmptyState
          icon={<Radar className="h-8 w-8" />}
          title="Run the autonomous monitor"
          description="Pick a scenario and run a proactive scan to watch the agent diagnose the asset live, step by step."
        />
      ) : (
        <Card>
          <CardHeader
            title="Live self-diagnosis"
            subtitle="The autonomous monitor reasons over the asset, then writes a structured diagnosis"
          />
          <CardBody className="space-y-4">
            {stream.streaming && stream.trace.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" /> Starting scan…
              </p>
            )}

            <TraceList trace={stream.trace} streaming={stream.streaming} title="Agent steps" />
            <div ref={traceEndRef} />

            {noOutcome && (
              <p className="text-sm text-ink-muted">
                No new alert was raised (the monitor is debounced). Reset to re-arm and run it again.
              </p>
            )}
            {stream.error && <p className="text-sm text-critical-fg">{stream.error}</p>}

            {outcome && (
              <div ref={diagnosisRef} className="space-y-3 border-t border-hairline pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={outcome.severity} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Diagnosis
                      </span>
                    </div>
                    {finalAlert?.headline && (
                      <p className="mt-1.5 text-sm font-semibold text-ink-heading">{finalAlert.headline}</p>
                    )}
                    {finalAlert?.subline && <p className="mt-0.5 text-xs text-ink-muted">{finalAlert.subline}</p>}
                  </div>
                  <Link
                    to={`/tickets/${outcome.ticket_id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    Ticket {outcome.ticket_id} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {ticket.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : ticket.data?.answer ? (
                  <MarkdownView>{ticket.data.answer}</MarkdownView>
                ) : finalAlert?.analysis_summary ? (
                  <MarkdownView>{finalAlert.analysis_summary}</MarkdownView>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-ink-subtle">
        Runs the autonomous monitor on the selected asset and streams the agent&apos;s diagnosis live.
      </p>
    </section>
  );
}
