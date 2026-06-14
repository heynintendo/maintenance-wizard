import { Link } from 'react-router-dom';

import { AlertTriangle, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { severityStyle } from '@/lib/severity';
import type { Alert } from '@/lib/types';

export function AlertBanner({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const s = severityStyle(alert.severity);
  return (
    <div className={cn('flex items-center gap-3 border-b px-6 py-2.5 text-sm', s.badge)}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">
        <span className="font-semibold">{s.label} alert</span> · {alert.message}
      </span>
      {alert.ticket_id && (
        <Link to={`/tickets/${alert.ticket_id}`} className="shrink-0 font-medium underline">
          View ticket
        </Link>
      )}
      <Link to="/alerts" className="shrink-0 font-medium underline">
        Alert center
      </Link>
      <button onClick={onDismiss} className="shrink-0" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
