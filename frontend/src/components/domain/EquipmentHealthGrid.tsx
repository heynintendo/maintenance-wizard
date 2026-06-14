import { Link } from 'react-router-dom';

import { AssetSparkline } from '@/components/domain/AssetSparkline';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { scoreToSeverity, severityStyle } from '@/lib/severity';
import type { Equipment, PriorityItem } from '@/lib/types';

export function EquipmentHealthGrid({
  equipment,
  priority,
}: {
  equipment: Equipment[];
  priority: PriorityItem[];
}) {
  const scoreById = new Map(priority.map((p) => [p.equipment_id, p.priority_score]));
  const monitored = equipment.filter((e) => e.monitored);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {monitored.map((e) => {
        const score = scoreById.get(e.equipment_id) ?? 0;
        const s = severityStyle(scoreToSeverity(score));
        return (
          <Link
            key={e.equipment_id}
            to={`/equipment/${e.equipment_id}`}
            className="rounded-lg border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-brand-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{e.name}</p>
                <p className="font-mono text-xs text-ink-subtle">{e.equipment_id}</p>
              </div>
              <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', s.dot)} />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className={cn('text-2xl font-semibold tabular-nums', s.solid)}>
                {formatNumber(score, 0)}
              </span>
              <span className="text-xs text-ink-muted">{e.area}</span>
            </div>
            {/* Real governing-channel trend; renders nothing if the asset has no series. */}
            <div className="mt-2">
              <AssetSparkline equipmentId={e.equipment_id} tone={scoreToSeverity(score)} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
