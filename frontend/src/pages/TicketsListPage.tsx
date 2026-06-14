import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/shell/PageHeader';
import {
  Card,
  EmptyState,
  ErrorState,
  Select,
  SeverityBadge,
  Skeleton,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ui';
import { useEquipment, useTickets } from '@/hooks/queries';
import { formatDateTime, titleCase } from '@/lib/format';

const STATUSES = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'];

export default function TicketsListPage() {
  const [status, setStatus] = useState('all');
  const [equipmentId, setEquipmentId] = useState('all');
  const equipment = useEquipment();
  const tickets = useTickets({
    status: status === 'all' ? undefined : status,
    equipment_id: equipmentId === 'all' ? undefined : equipmentId,
  });
  const navigate = useNavigate();
  const rows = tickets.data ?? [];

  return (
    <>
      <PageHeader title="Tickets" description="Maintenance work queue" />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <Select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            <option value="all">All equipment</option>
            {(equipment.data ?? []).map((e) => (
              <option key={e.equipment_id} value={e.equipment_id}>
                {e.name}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-sm text-ink-muted">
            {rows.length} {rows.length === 1 ? 'ticket' : 'tickets'}
          </span>
        </div>

        <Card>
          {tickets.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tickets.error ? (
            <ErrorState onRetry={() => tickets.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title="No tickets" description="No tickets match these filters." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Ticket</TH>
                  <TH>Equipment</TH>
                  <TH>Kind</TH>
                  <TH>Severity</TH>
                  <TH>Status</TH>
                  <TH>Updated</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((t) => (
                  <TR
                    key={t.ticket_id}
                    className="cursor-pointer transition-colors hover:bg-canvas"
                    onClick={() => navigate(`/tickets/${t.ticket_id}`)}
                  >
                    <TD>
                      <div className="font-medium text-ink">{t.title}</div>
                      <div className="font-mono text-xs text-ink-subtle">{t.ticket_id}</div>
                    </TD>
                    <TD className="font-mono text-xs text-ink-secondary">{t.equipment_id}</TD>
                    <TD className="text-ink-secondary">{titleCase(t.kind)}</TD>
                    <TD>
                      <SeverityBadge severity={t.severity} />
                    </TD>
                    <TD>
                      <StatusBadge status={t.status} />
                    </TD>
                    <TD className="text-xs text-ink-muted">{formatDateTime(t.updated_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
