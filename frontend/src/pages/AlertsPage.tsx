import { useState } from 'react';

import { BellOff } from 'lucide-react';

import { useAuth } from '@/auth/AuthContext';
import { canDo } from '@/auth/roles';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, Skeleton, Tabs, useToast } from '@/components/ui';
import { AlertCard } from '@/components/domain/AlertCard';
import { ProactiveTrigger } from '@/components/domain/ProactiveTrigger';
import { useAckAlert } from '@/hooks/mutations';
import { useAlerts } from '@/hooks/queries';
import { useAnchorOffsetMs } from '@/lib/time';

export default function AlertsPage() {
  const { user } = useAuth();
  const alerts = useAlerts();
  const ack = useAckAlert();
  const { toast } = useToast();
  const canAck = canDo(user?.role, 'ack_alert');
  const offset = useAnchorOffsetMs();
  const [filter, setFilter] = useState<'unack' | 'all'>('unack');

  const list = (alerts.data ?? []).filter((a) => (filter === 'unack' ? !a.acknowledged : true));

  return (
    <>
      <PageHeader
        title="Alert center"
        description="Run the autonomous monitor, watch it diagnose live, then acknowledge the alert"
      />
      <div className="space-y-8 p-6">
        {/* The live self-diagnosis is the focus: full-width, top of the page. */}
        <ProactiveTrigger />

        {/* The alert list, clearly separated below the live scan. */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-ink-heading">Alerts</h2>
            <Tabs
              tabs={[
                { key: 'unack', label: 'Unacknowledged' },
                { key: 'all', label: 'All' },
              ]}
              active={filter}
              onChange={(k) => setFilter(k === 'all' ? 'all' : 'unack')}
            />
            <span className="ml-auto text-sm text-ink-muted">{list.length}</span>
          </div>

          {alerts.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<BellOff className="h-8 w-8" />}
              title="No alerts"
              description={
                filter === 'unack'
                  ? 'All alerts are acknowledged. Run a proactive scan to raise one.'
                  : 'No alerts have been raised yet.'
              }
            />
          ) : (
            <div className="space-y-3">
              {list.map((a) => (
                <AlertCard
                  key={a.alert_id}
                  alert={a}
                  offsetMs={offset}
                  canAck={canAck}
                  acking={ack.isPending}
                  onAck={() =>
                    ack.mutate(a.alert_id, {
                      onSuccess: () => toast('Alert acknowledged', 'success'),
                      onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
