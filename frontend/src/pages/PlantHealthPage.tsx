import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ChevronRight } from 'lucide-react';

import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, ErrorState, SeverityBadge, Skeleton } from '@/components/ui';
import { useAlerts, useEquipment, usePriority } from '@/hooks/queries';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { type Severity, scoreToSeverity, severityStyle } from '@/lib/severity';
import type { Alert, Equipment } from '@/lib/types';

/**
 * Area "health %" rolled up from the live per-asset priority scores.
 *
 * Priority is a RISK score (0-100, higher = worse). We blend the area MEAN (the overall
 * risk burden across the area) with the area MAX (its single worst asset) so one critical
 * asset legitimately drags the area down and cannot be masked by healthy neighbours, then
 * invert to a health percentage and clamp to 0-100:
 *
 *     areaRisk = 0.5 * mean(scores) + 0.5 * max(scores)
 *     health % = clamp(round(100 - areaRisk), 0, 100)
 *
 * Real data only: assets without a priority score are excluded from the rollup; an area with
 * no scored assets has `health = null` (rendered as an empty state, never a fabricated number).
 * The same transform is applied across ALL scored assets for the plant-wide summary.
 */
function rollupHealth(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const areaRisk = 0.5 * mean + 0.5 * max;
  return Math.max(0, Math.min(100, Math.round(100 - areaRisk)));
}

// Colour a health % on the SAME semantic bands the app uses for risk: high health reads
// green, low health reads red. (scoreToSeverity buckets the risk-equivalent value 100-health.)
function healthTone(health: number | null): Severity | 'neutral' {
  if (health === null) return 'neutral';
  return scoreToSeverity(100 - health);
}

interface AreaAsset {
  id: string;
  name: string;
  score: number | null;
  monitored: boolean;
}

interface AreaRollup {
  area: string;
  health: number | null;
  assets: AreaAsset[]; // sorted by score desc (worst first)
  alerts: Alert[];
}

function buildAreas(equipment: Equipment[], scoreById: Map<string, number>, alerts: Alert[]): AreaRollup[] {
  const byArea = new Map<string, Equipment[]>();
  for (const e of equipment) {
    const area = e.area || 'Unassigned';
    const list = byArea.get(area);
    if (list) list.push(e);
    else byArea.set(area, [e]);
  }

  const alertsByArea = new Map<string, Alert[]>();
  const areaByEq = new Map(equipment.map((e) => [e.equipment_id, e.area || 'Unassigned']));
  for (const a of alerts) {
    const area = areaByEq.get(a.equipment_id);
    if (!area) continue;
    const list = alertsByArea.get(area);
    if (list) list.push(a);
    else alertsByArea.set(area, [a]);
  }

  const areas: AreaRollup[] = [];
  for (const [area, list] of byArea) {
    const assets: AreaAsset[] = list
      .map((e) => ({
        id: e.equipment_id,
        name: e.name,
        score: scoreById.has(e.equipment_id) ? (scoreById.get(e.equipment_id) as number) : null,
        monitored: !!e.monitored,
      }))
      .sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
    const scores = assets.map((a) => a.score).filter((s): s is number => typeof s === 'number');
    areas.push({ area, health: rollupHealth(scores), assets, alerts: alertsByArea.get(area) ?? [] });
  }

  // Worst (lowest health) first; areas with no data sink to the bottom.
  return areas.sort((a, b) => (a.health ?? 999) - (b.health ?? 999));
}

function AreaCard({
  rollup,
  selected,
  onSelect,
}: {
  rollup: AreaRollup;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = healthTone(rollup.health);
  const s = severityStyle(tone);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-expanded={selected}
      className={cn(
        'rounded-lg border p-4 text-left shadow-card transition-all',
        s.badge, // tone-tinted surface: bg-{tone}-50 + border-{tone}-200
        'hover:shadow-pop',
        selected && 'ring-2 ring-brand-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink-heading">{rollup.area}</p>
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 text-ink-subtle transition-transform', selected && 'rotate-90')}
        />
      </div>
      <div className="mt-2 flex items-end gap-2">
        {rollup.health === null ? (
          <span className="text-sm text-ink-muted">No data</span>
        ) : (
          <>
            <span className={cn('text-4xl font-bold leading-none tabular-nums', s.solid)}>
              {rollup.health}
            </span>
            <span className={cn('pb-0.5 text-base font-semibold', s.solid)}>%</span>
          </>
        )}
      </div>
      {/* linear health bar (0-100 is a tame range, so a direct bar reads truthfully) */}
      {rollup.health !== null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface/70" aria-hidden>
          <div className={cn('h-full rounded-full', s.dot)} style={{ width: `${rollup.health}%` }} />
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
        <span>
          {rollup.assets.length} asset{rollup.assets.length === 1 ? '' : 's'}
        </span>
        {rollup.alerts.length > 0 && (
          <span className="font-medium text-critical-fg">
            · {rollup.alerts.length} active alert{rollup.alerts.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </button>
  );
}

function AreaDetail({ rollup }: { rollup: AreaRollup }) {
  return (
    <Card>
      <CardHeader
        title={`${rollup.area}, what's driving health`}
        subtitle={
          rollup.health === null
            ? 'No scored assets in this area'
            : `Health ${rollup.health}% · ${rollup.assets.length} assets · ${rollup.alerts.length} active alerts`
        }
      />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Assets by current priority
          </p>
          {rollup.assets.length === 0 ? (
            <EmptyState title="No assets" description="This area has no assets." />
          ) : (
            <div className="divide-y divide-hairline">
              {rollup.assets.map((a) => {
                const sev = a.score === null ? 'neutral' : scoreToSeverity(a.score);
                return (
                  <Link
                    key={a.id}
                    to={`/equipment/${a.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-canvas"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                      <p className="font-mono text-xs text-ink-subtle">{a.id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {!a.monitored && <span className="text-xs text-ink-subtle">not monitored</span>}
                      {a.score !== null && (
                        <span className={cn('text-sm font-semibold tabular-nums', severityStyle(sev).solid)}>
                          {formatNumber(a.score, 1)}
                        </span>
                      )}
                      <SeverityBadge severity={sev} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Active alerts in this area
          </p>
          {rollup.alerts.length === 0 ? (
            <p className="text-sm text-ink-muted">No active alerts.</p>
          ) : (
            <div className="space-y-2">
              {rollup.alerts.map((al) => (
                <Link
                  key={al.alert_id}
                  to={al.ticket_id ? `/tickets/${al.ticket_id}` : '/alerts'}
                  className="flex items-start justify-between gap-3 rounded-md border border-hairline bg-canvas px-3 py-2 transition-colors hover:border-brand-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{al.headline ?? al.message}</p>
                    {al.subline && <p className="truncate text-xs text-ink-muted">{al.subline}</p>}
                  </div>
                  <SeverityBadge severity={al.severity} className="shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function PlantHealthPage() {
  const eq = useEquipment();
  const pr = usePriority();
  const al = useAlerts({ unacknowledged: true });
  const [selected, setSelected] = useState<string | null>(null);

  if (eq.isLoading || pr.isLoading) {
    return (
      <>
        <PageHeader title="Plant Health" description="Area-level health rolled up from live asset priority" />
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </>
    );
  }
  if (eq.error || !eq.data) {
    return (
      <>
        <PageHeader title="Plant Health" />
        <ErrorState message="Could not load plant data." onRetry={() => eq.refetch()} />
      </>
    );
  }

  const equipment = eq.data;
  const scoreById = new Map((pr.data ?? []).map((p) => [p.equipment_id, p.priority_score]));
  const areas = buildAreas(equipment, scoreById, al.data ?? []);

  const plantScores = equipment
    .map((e) => scoreById.get(e.equipment_id))
    .filter((s): s is number => typeof s === 'number');
  const plantHealth = rollupHealth(plantScores);
  const plantTone = healthTone(plantHealth);
  const ps = severityStyle(plantTone);

  const activeArea = selected ?? areas.find((a) => a.health !== null)?.area ?? areas[0]?.area ?? null;
  const detail = areas.find((a) => a.area === activeArea) ?? null;
  const monitoredCount = equipment.filter((e) => e.monitored).length;

  return (
    <>
      <PageHeader
        title="Plant Health"
        description="Area-level health rolled up from live asset priority, tap an area to see what's dragging it down"
      />
      <div className="space-y-6 p-6">
        {/* Plant-wide summary, same transform across all scored assets. */}
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Plant-wide health
              </p>
              <div className="mt-1 flex items-end gap-2">
                {plantHealth === null ? (
                  <span className="text-sm text-ink-muted">No data</span>
                ) : (
                  <>
                    <span className={cn('text-5xl font-bold leading-none tabular-nums', ps.solid)}>
                      {plantHealth}
                    </span>
                    <span className={cn('pb-1 text-xl font-semibold', ps.solid)}>%</span>
                    <SeverityBadge severity={plantTone} className="mb-1 ml-2" />
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-2xl font-semibold tabular-nums text-ink-heading">{areas.length}</p>
                <p className="text-xs text-ink-muted">areas</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-ink-heading">{equipment.length}</p>
                <p className="text-xs text-ink-muted">assets</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-ink-heading">{monitoredCount}</p>
                <p className="text-xs text-ink-muted">monitored</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Area grid, colour-graded, worst first. */}
        {areas.length === 0 ? (
          <EmptyState title="No areas" description="No equipment is registered yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {areas.map((a) => (
              <AreaCard
                key={a.area}
                rollup={a}
                selected={a.area === activeArea}
                onSelect={() => setSelected(a.area)}
              />
            ))}
          </div>
        )}

        {/* Expanded detail for the selected area. */}
        {detail && <AreaDetail rollup={detail} />}
      </div>
    </>
  );
}
