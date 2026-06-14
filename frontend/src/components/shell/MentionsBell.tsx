import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AtSign } from 'lucide-react';

import { MentionText } from '@/components/domain/MentionText';
import { useMyMentions } from '@/hooks/useMyMentions';

/**
 * Header surface for "mentions of me" -- a self-contained bell (additive; does not touch the
 * existing AlertBell/MuteToggle). Shows a real count of items mentioning the current user and a
 * dropdown linking to each source. Read-only; derived from already-fetched data.
 */
export function MentionsBell() {
  const { items, count } = useMyMentions();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-white/80 transition-colors hover:bg-white/10"
        title="Mentions of you"
        aria-label={`Mentions of you (${count})`}
      >
        <AtSign className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-pop">
            <p className="border-b border-hairline px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Mentions ({count})
            </p>
            {items.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-ink-muted">No one has mentioned you yet.</p>
            ) : (
              <ul className="max-h-80 overflow-auto py-1">
                {items.map((m) => (
                  <li key={m.key}>
                    <Link
                      to={m.to}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 transition-colors hover:bg-canvas"
                    >
                      <p className="text-xs font-medium text-ink-secondary">
                        {m.kind === 'ticket' ? 'Ticket' : 'Logbook'} · {m.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink">
                        <MentionText>{m.snippet}</MentionText>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
