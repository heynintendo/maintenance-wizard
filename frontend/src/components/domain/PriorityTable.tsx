import { useNavigate } from 'react-router-dom';

import { SeverityBadge, TBody, TD, TH, THead, TR, Table } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { scoreToSeverity, severityStyle } from '@/lib/severity';
import type { PriorityItem } from '@/lib/types';

export function PriorityTable({ items, limit }: { items: PriorityItem[]; limit?: number }) {
  const navigate = useNavigate();
  const rows = limit ? items.slice(0, limit) : items;

  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-10">#</TH>
          <TH>Asset</TH>
          <TH className="text-right">Priority</TH>
          <TH>Band</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((it, i) => {
          const sev = scoreToSeverity(it.priority_score);
          return (
            <TR
              key={it.equipment_id}
              className="cursor-pointer transition-colors hover:bg-canvas"
              onClick={() => navigate(`/equipment/${it.equipment_id}`)}
            >
              <TD className="text-ink-muted">{it.rank ?? i + 1}</TD>
              <TD>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{it.name}</span>
                  {it.vital_few && (
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                      Vital few
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-ink-subtle">{it.equipment_id}</div>
              </TD>
              <TD className="text-right">
                <span className={cn('font-semibold tabular-nums', severityStyle(sev).solid)}>
                  {formatNumber(it.priority_score, 1)}
                </span>
              </TD>
              <TD>
                <SeverityBadge severity={sev} />
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
