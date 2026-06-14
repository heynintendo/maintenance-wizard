import { formatDateTime, titleCase } from '@/lib/format';
import type { TicketUpdate } from '@/lib/types';

import { MentionText } from './MentionText';

export function TicketTimeline({ items }: { items: TicketUpdate[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-ink-muted">No timeline entries yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {items.map((u, i) => (
        <li key={i} className="relative pl-6">
          <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-brand-400 ring-4 ring-brand-50" />
          {i < items.length - 1 && (
            <span className="absolute left-[4px] top-4 h-full w-px bg-hairline" />
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-secondary">
              {u.status ? titleCase(u.status) : 'Note'}
            </span>
            <span className="text-xs text-ink-subtle">{formatDateTime(u.timestamp)}</span>
          </div>
          <p className="mt-0.5 text-sm text-ink">
            <MentionText>{u.note}</MentionText>
          </p>
          {u.author && (
            <p className="mt-0.5 text-xs text-ink-subtle">
              {u.author === 'U-SYS-AMDC' ? 'Autonomous (AMDC)' : u.author}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
