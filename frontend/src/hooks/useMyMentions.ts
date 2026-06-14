import { useAuth } from '@/auth/AuthContext';
import { useLogbook, useTickets } from '@/hooks/queries';
import { titleCase } from '@/lib/format';
import { textMentionsName } from '@/lib/mentions';

export interface MyMention {
  key: string;
  kind: 'ticket' | 'logbook';
  to: string; // route to the source
  label: string; // source identifier (ticket id/title, or logbook entry type/asset)
  snippet: string; // the text that mentions me
}

/**
 * Read-only, derived: the ticket notes and logbook entries whose text `@[...]`-mentions the
 * current user. Scans data ALREADY fetched by the existing hooks (useTickets, useLogbook) --
 * no new endpoint, no write, no server-state mutation.
 */
export function useMyMentions(): { items: MyMention[]; count: number } {
  const { user } = useAuth();
  const tickets = useTickets();
  const logbook = useLogbook({ limit: 100 });

  const me = user?.name;
  if (!me) return { items: [], count: 0 };

  const items: MyMention[] = [];
  for (const t of tickets.data ?? []) {
    (t.timeline ?? []).forEach((u, i) => {
      if (textMentionsName(u.note, me)) {
        items.push({
          key: `t-${t.ticket_id}-${i}`,
          kind: 'ticket',
          to: `/tickets/${t.ticket_id}`,
          label: `${t.ticket_id} · ${t.title}`,
          snippet: u.note,
        });
      }
    });
  }
  for (const l of logbook.data ?? []) {
    if (textMentionsName(l.text, me)) {
      items.push({
        key: `l-${l.entry_id}`,
        kind: 'logbook',
        to: '/logbook',
        label: `${titleCase(l.entry_type)} · ${l.equipment_id}`,
        snippet: l.text,
      });
    }
  }
  return { items, count: items.length };
}
