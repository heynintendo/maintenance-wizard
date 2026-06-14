import { Link } from 'react-router-dom';

import { Button, MarkdownView, SeverityBadge } from '@/components/ui';
import { AnomalyGauge } from '@/components/domain/AnomalyGauge';
import { cn } from '@/lib/cn';
import { cleanTruncatedMarkdown, formatDateTime } from '@/lib/format';
import { anchored } from '@/lib/time';
import type { Alert } from '@/lib/types';

interface AlertCardProps {
  alert: Alert;
  onAck?: () => void;
  canAck?: boolean;
  acking?: boolean;
  offsetMs?: number;
}

export function AlertCard({ alert, onAck, canAck, acking, offsetMs = 0 }: AlertCardProps) {
  // The stored analysis_summary is a server-side 500-char cut that can sever a markdown
  // token; sanitize it so the card never shows a literal "**" or a half sentence.
  const detail = cleanTruncatedMarkdown(alert.analysis_summary);
  // The alarm threshold is exposed in the subline ("… alarm ≥ 6 …"); parse it (real value,
  // never fabricated) so the gauge can show score vs threshold. Skip the gauge if absent.
  const thresholdMatch = alert.subline?.match(/alarm\s*≥\s*([\d.]+)/);
  const threshold = thresholdMatch ? Number(thresholdMatch[1]) : null;
  return (
    <div
      className={cn(
        'rounded-lg border border-hairline bg-surface p-4 shadow-card',
        alert.acknowledged && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-ink-subtle">
            {formatDateTime(anchored(alert.timestamp, offsetMs))}
          </span>
        </div>
        {alert.acknowledged ? (
          <span className="text-xs font-medium text-healthy-fg">Acknowledged</span>
        ) : (
          canAck &&
          onAck && (
            <Button size="sm" variant="secondary" onClick={onAck} loading={acking}>
              Acknowledge
            </Button>
          )
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{alert.headline ?? alert.message}</p>
      {alert.subline && <p className="mt-0.5 text-xs text-ink-muted">{alert.subline}</p>}
      {alert.anomaly_score != null && threshold != null && (
        <AnomalyGauge score={alert.anomaly_score} threshold={threshold} severity={alert.severity} />
      )}
      {detail && (
        <MarkdownView className="mt-1.5 text-ink-muted" compact>
          {detail}
        </MarkdownView>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-ink-subtle">
        <span className="font-mono">{alert.equipment_id}</span>
        {alert.ticket_id && (
          <Link to={`/tickets/${alert.ticket_id}`} className="text-brand-600 hover:text-brand-700">
            {alert.ticket_id} →
          </Link>
        )}
      </div>
    </div>
  );
}
