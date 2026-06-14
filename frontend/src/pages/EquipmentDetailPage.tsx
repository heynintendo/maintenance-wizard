import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { PageHeader } from '@/components/shell/PageHeader';
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Select,
  SeverityBadge,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { ClimbingTrendChart, climbingPair } from '@/components/domain/ClimbingTrendChart';
import { MentionText } from '@/components/domain/MentionText';
import { SensorChart } from '@/components/domain/SensorChart';
import { useEquipmentDetail, useSensors } from '@/hooks/queries';
import { channelLabel } from '@/lib/channels';
import { formatDate, formatDateTime, formatNumber, titleCase } from '@/lib/format';
import { useAnchorOffsetMs } from '@/lib/time';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value === undefined || value === null || value === '' ? '-' : value}</dd>
    </div>
  );
}

export default function EquipmentDetailPage() {
  const { id = '' } = useParams();
  const detail = useEquipmentDetail(id);
  const sensors = useSensors(id, true);
  const offset = useAnchorOffsetMs();
  const [channel, setChannel] = useState<string | null>(null);

  if (detail.isLoading) {
    return (
      <>
        <PageHeader title="Loading…" />
        <div className="p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <>
        <PageHeader title="Equipment" />
        <ErrorState message="Could not load this asset." onRetry={() => detail.refetch()} />
      </>
    );
  }

  const { equipment: e, open_tickets, logbook } = detail.data;
  const sensorData = sensors.data;
  const climb = climbingPair(sensorData); // vibration + temperature pair, or null
  const channels = sensorData ? Object.keys(sensorData.channels) : [];
  const activeChannel = channel ?? channels[0] ?? '';
  const ch = sensorData && activeChannel ? sensorData.channels[activeChannel] : undefined;

  return (
    <>
      <PageHeader
        title={e.name}
        description={`${titleCase(e.type)} · ${e.area}`}
        breadcrumb={<Breadcrumb items={[{ label: 'Equipment', to: '/equipment' }, { label: e.name }]} />}
      />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        {sensorData && climb && (
          <Card className="lg:col-span-3">
            <CardHeader
              title="Vibration & temperature"
              subtitle="Two signals on a shared timeline, watch them climb together"
            />
            <CardBody>
              <ClimbingTrendChart data={sensorData} pair={climb} offsetMs={offset} />
            </CardBody>
          </Card>
        )}

        <Card className="lg:col-span-1">
          <CardHeader title="Asset details" subtitle={e.equipment_id} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Area" value={e.area} />
              <Field label="Type" value={titleCase(e.type)} />
              <Field label="Criticality" value={titleCase(e.process_criticality ?? '')} />
              <Field label="Monitored" value={e.monitored ? 'Yes' : 'No'} />
              <Field label="Install date" value={formatDate(e.install_date)} />
              <Field label="Service hours" value={formatNumber(e.service_hours, 0)} />
              <Field label="MTBF (h)" value={formatNumber(e.mtbf_hours, 0)} />
              <Field label="Model" value={e.model_no} />
              <Field label="Spares" value={titleCase(e.spare_availability ?? '')} />
              <Field label="Lead time (wk)" value={formatNumber(e.procurement_lead_time_weeks, 0)} />
            </dl>
            {e.notes && (
              <p className="mt-4 border-t border-hairline pt-3 text-sm text-ink-muted">{e.notes}</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Sensor trends"
            subtitle={sensorData ? `${sensorData.window.n_samples} samples in window` : undefined}
            actions={
              channels.length > 0 ? (
                <Select value={activeChannel} onChange={(ev) => setChannel(ev.target.value)}>
                  {channels.map((c) => (
                    <option key={c} value={c}>
                      {channelLabel(c)}
                    </option>
                  ))}
                </Select>
              ) : undefined
            }
          />
          <CardBody>
            {sensors.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !sensorData || channels.length === 0 ? (
              <EmptyState title="No sensor data" description="This asset is not instrumented." />
            ) : (
              <>
                <SensorChart data={sensorData} channel={activeChannel} offsetMs={offset} />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ch && (
                    <>
                      <Field label="Latest" value={`${formatNumber(ch.latest, 2)} ${ch.unit}`} />
                      <Field label="Mean" value={formatNumber(ch.mean, 2)} />
                      <Field label="Slope / day" value={formatNumber(ch.slope_per_day, 3)} />
                      <Field label="Anomalies" value={sensorData.anomalies.count} />
                    </>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Open tickets" />
          {open_tickets.length === 0 ? (
            <EmptyState title="No open tickets" />
          ) : (
            <div className="divide-y divide-hairline">
              {open_tickets.map((t) => (
                <Link
                  key={t.ticket_id}
                  to={`/tickets/${t.ticket_id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-canvas"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                    <p className="font-mono text-xs text-ink-subtle">{t.ticket_id}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={t.severity} />
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Recent logbook" />
          {logbook.length === 0 ? (
            <EmptyState title="No entries" />
          ) : (
            <div className="divide-y divide-hairline">
              {logbook.slice(0, 6).map((l) => (
                <div key={l.entry_id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink-secondary">{titleCase(l.entry_type)}</span>
                    <span className="text-xs text-ink-subtle">{formatDateTime(l.timestamp)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink">
                    <MentionText>{l.text}</MentionText>
                  </p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {l.author_user_id === 'U-SYS-AMDC' ? 'Autonomous (AMDC)' : l.author_user_id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
