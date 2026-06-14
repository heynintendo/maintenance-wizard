import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Search } from 'lucide-react';

import { PageHeader } from '@/components/shell/PageHeader';
import {
  Badge,
  Card,
  ErrorState,
  Select,
  Skeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Toggle,
} from '@/components/ui';
import { useEquipment, usePriority } from '@/hooks/queries';
import { cn } from '@/lib/cn';
import { formatNumber, titleCase } from '@/lib/format';
import { scoreToSeverity, severityStyle, spareChip, toneClasses } from '@/lib/severity';

export default function EquipmentListPage() {
  const equipment = useEquipment();
  const priority = usePriority();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');
  const [monitoredOnly, setMonitoredOnly] = useState(false);

  const scoreById = useMemo(
    () => new Map((priority.data ?? []).map((p) => [p.equipment_id, p.priority_score])),
    [priority.data],
  );
  const areas = useMemo(
    () => Array.from(new Set((equipment.data ?? []).map((e) => e.area))).sort(),
    [equipment.data],
  );

  const rows = useMemo(() => {
    let list = equipment.data ?? [];
    if (area !== 'all') list = list.filter((e) => e.area === area);
    if (monitoredOnly) list = list.filter((e) => e.monitored);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.equipment_id.toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) => (scoreById.get(b.equipment_id) ?? 0) - (scoreById.get(a.equipment_id) ?? 0),
    );
  }, [equipment.data, area, monitoredOnly, search, scoreById]);

  return (
    <>
      <PageHeader title="Equipment" description="Hot Strip Mill assets, ranked by current priority" />
      <div className="space-y-4 p-6">
        <p className="text-xs text-ink-muted">
          Criticality is the asset&apos;s inherent importance rating; Priority is its current dynamic
          risk score, so a high-criticality asset can still sit at a lower live priority.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="h-9 w-64 rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Toggle checked={monitoredOnly} onChange={setMonitoredOnly} label="Monitored only" />
          <span className="ml-auto text-sm text-ink-muted">{rows.length} assets</span>
        </div>

        <Card>
          {equipment.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : equipment.error ? (
            <ErrorState onRetry={() => equipment.refetch()} />
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-muted">No assets match.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Asset</TH>
                  <TH>Area</TH>
                  <TH>Type</TH>
                  <TH>Criticality</TH>
                  <TH>Spares</TH>
                  <TH className="text-right">Priority</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((e) => {
                  const score = scoreById.get(e.equipment_id) ?? 0;
                  const sev = scoreToSeverity(score);
                  return (
                    <TR
                      key={e.equipment_id}
                      className="cursor-pointer transition-colors hover:bg-canvas"
                      onClick={() => navigate(`/equipment/${e.equipment_id}`)}
                    >
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">{e.name}</span>
                          {e.monitored && (
                            <span className="h-1.5 w-1.5 rounded-full bg-healthy" title="Monitored" />
                          )}
                        </div>
                        <div className="font-mono text-xs text-ink-subtle">{e.equipment_id}</div>
                      </TD>
                      <TD className="text-ink-secondary">{e.area}</TD>
                      <TD className="text-ink-secondary">{titleCase(e.type)}</TD>
                      <TD>
                        {e.process_criticality ? (
                          <Badge className={toneClasses(e.process_criticality).chip}>
                            {titleCase(e.process_criticality)}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TD>
                      <TD>
                        {e.spare_availability ? (
                          <Badge className={spareChip(e.spare_availability)}>
                            {titleCase(e.spare_availability)}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TD>
                      <TD className="text-right">
                        <span className={cn('font-semibold tabular-nums', severityStyle(sev).solid)}>
                          {formatNumber(score, 1)}
                        </span>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
