import { Link } from 'react-router-dom';

import { Activity, Bell, Boxes, Radar, Ticket as TicketIcon } from 'lucide-react';

import { PageHeader } from '@/components/shell/PageHeader';
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  SeverityBadge,
  Skeleton,
  Stat,
} from '@/components/ui';
import { EquipmentHealthGrid } from '@/components/domain/EquipmentHealthGrid';
import { PriorityTable } from '@/components/domain/PriorityTable';
import { useAlerts, useEquipment, usePriority, useProactiveState, useTickets } from '@/hooks/queries';
import { formatDateTime, relativeTime } from '@/lib/format';
import { anchored, useAnchorOffsetMs } from '@/lib/time';

export default function DashboardPage() {
  const priority = usePriority();
  const equipment = useEquipment();
  const alerts = useAlerts({ unacknowledged: true });
  const tickets = useTickets();
  const proactive = useProactiveState();

  const ranked = priority.data ?? [];
  const equip = equipment.data ?? [];
  const activeAlerts = alerts.data ?? [];
  const openTickets = (tickets.data ?? []).filter(
    (t) => t.status !== 'closed' && t.status !== 'resolved',
  );
  const monitoredCount = equip.filter((e) => e.monitored).length;
  const vitalFew = ranked.filter((p) => p.vital_few).length;
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical').length;
  const offset = useAnchorOffsetMs();

  return (
    <>
      <PageHeader
        title="Operations dashboard"
        description="Health, priority, and autonomous monitoring for the Hot Strip Mill finishing area"
      />
      <div className="space-y-6 p-6">
        {/* KPI strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Monitored assets"
            value={equipment.isLoading ? '-' : monitoredCount}
            hint={`of ${equip.length} total assets`}
            icon={<Boxes className="h-4 w-4" />}
          />
          <Stat
            label="Vital few"
            value={priority.isLoading ? '-' : vitalFew}
            hint="MTR 20/80 priority focus"
            icon={<Activity className="h-4 w-4" />}
          />
          <Stat
            label="Active alerts"
            value={alerts.isLoading ? '-' : activeAlerts.length}
            hint={criticalAlerts ? `${criticalAlerts} critical` : 'none critical'}
            accent={activeAlerts.length ? 'text-critical' : undefined}
            icon={<Bell className="h-4 w-4" />}
          />
          <Stat
            label="Open tickets"
            value={tickets.isLoading ? '-' : openTickets.length}
            hint="in the maintenance queue"
            icon={<TicketIcon className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Priority ranking */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="MTR priority ranking"
              subtitle="Four-dimension score with dynamic risk folded in"
              actions={
                <Link to="/equipment" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              }
            />
            {priority.isLoading ? (
              <CardBody className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardBody>
            ) : priority.error ? (
              <ErrorState message="Could not load priority ranking." onRetry={() => priority.refetch()} />
            ) : (
              <PriorityTable items={ranked} limit={8} />
            )}
          </Card>

          {/* Right column: autonomous monitoring + active alerts */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Autonomous monitoring" subtitle="Continuous autonomous monitoring" />
              <CardBody className="space-y-3 text-sm">
                {proactive.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : proactive.data ? (
                  <>
                    <div className="flex items-center gap-2 text-ink-secondary">
                      <Radar className="h-4 w-4 text-brand-500" />
                      <span>
                        Last scan{' '}
                        <span className="font-medium text-ink">
                          {relativeTime(proactive.data.last_polled_at)}
                        </span>
                      </span>
                    </div>
                    <p className="text-ink-muted">
                      {proactive.data.monitored_assets.length} assets under continuous watch.
                    </p>
                    <Link
                      to="/alerts"
                      className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Open alert center →
                    </Link>
                  </>
                ) : (
                  <p className="text-ink-muted">Unavailable.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Active alerts"
                actions={
                  <Link to="/alerts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    All
                  </Link>
                }
              />
              {alerts.isLoading ? (
                <CardBody>
                  <Skeleton className="h-12 w-full" />
                </CardBody>
              ) : activeAlerts.length === 0 ? (
                <EmptyState title="No active alerts" description="All monitored assets are nominal." />
              ) : (
                <div className="divide-y divide-hairline">
                  {activeAlerts.slice(0, 4).map((a) => (
                    <Link
                      key={a.alert_id}
                      to="/alerts"
                      className="block px-5 py-3 transition-colors hover:bg-canvas"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <SeverityBadge severity={a.severity} />
                        <span className="text-xs text-ink-subtle">
                          {formatDateTime(anchored(a.timestamp, offset))}
                        </span>
                      </div>
                      {/* Same humanized headline the Alerts page shows -- never the raw
                          message ("…score 143.33, channels…"). Clamp the rendered headline
                          cleanly rather than slicing the string. */}
                      <p className="mt-1.5 line-clamp-2 text-sm text-ink-secondary">
                        {a.headline ?? a.message}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Equipment health */}
        <Card>
          <CardHeader title="Equipment health" subtitle="Monitored assets, coloured by priority band" />
          <CardBody>
            {equipment.isLoading || priority.isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <EquipmentHealthGrid equipment={equip} priority={ranked} />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
