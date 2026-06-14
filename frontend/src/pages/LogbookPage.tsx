import { useMemo, useState } from 'react';

import { Bot, User as UserIcon } from 'lucide-react';

import { PageHeader } from '@/components/shell/PageHeader';
import { Card, EmptyState, ErrorState, MarkdownView, Select, Skeleton } from '@/components/ui';
import { useEquipment, useLogbook, useUsers } from '@/hooks/queries';
import { MentionText } from '@/components/domain/MentionText';
import { cn } from '@/lib/cn';
import { formatDateTime, titleCase } from '@/lib/format';
import { hasMention } from '@/lib/mentions';
import { entryTypeChip } from '@/lib/severity';

export default function LogbookPage() {
  const [equipmentId, setEquipmentId] = useState('all');
  const equipment = useEquipment();
  const users = useUsers();
  const logbook = useLogbook({
    equipment_id: equipmentId === 'all' ? undefined : equipmentId,
    limit: 100,
  });
  const entries = logbook.data ?? [];
  // Reuse the same identity list the login picker uses -- no second hardcoded name map.
  const nameById = useMemo(
    () => new Map((users.data ?? []).map((u) => [u.user_id, u.name])),
    [users.data],
  );

  return (
    <>
      <PageHeader
        title="Digital logbook"
        description="Human and autonomous maintenance entries, with machine entries clearly marked"
      />
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            <option value="all">All equipment</option>
            {(equipment.data ?? []).map((e) => (
              <option key={e.equipment_id} value={e.equipment_id}>
                {e.name}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-sm text-ink-muted">{entries.length} entries</span>
        </div>

        <Card>
          {logbook.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : logbook.error ? (
            <ErrorState onRetry={() => logbook.refetch()} />
          ) : entries.length === 0 ? (
            <EmptyState title="No entries" description="The logbook is empty for this filter." />
          ) : (
            <div className="divide-y divide-hairline">
              {entries.map((l) => {
                const auto = l.author_user_id === 'U-SYS-AMDC';
                return (
                  <div key={l.entry_id} className={cn('flex gap-3 px-5 py-4', auto && 'bg-brand-50/40')}>
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        auto ? 'bg-brand-100 text-brand-700' : 'bg-canvas text-ink-muted',
                      )}
                    >
                      {auto ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-ink">
                            {auto
                              ? 'Maintenance Wizard (autonomous)'
                              : (nameById.get(l.author_user_id) ?? l.author_user_id)}
                          </span>
                          {!auto && (
                            <span className="font-mono text-xs text-ink-subtle">{l.author_user_id}</span>
                          )}
                        </span>
                        <span className="text-xs text-ink-subtle">{formatDateTime(l.timestamp)}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                        <span className={cn('rounded px-1.5 py-0.5 font-medium', entryTypeChip(l.entry_type))}>
                          {titleCase(l.entry_type)}
                        </span>
                        <span className="font-mono">{l.equipment_id}</span>
                        {l.related_fault_code && (
                          <span className="font-mono text-ink-subtle">{l.related_fault_code}</span>
                        )}
                      </div>
                      {hasMention(l.text) ? (
                        // Mention-bearing text renders with chips (plain text). Existing
                        // entries (no token) keep the exact MarkdownView rendering below.
                        <p className="mt-1.5 text-sm text-ink">
                          <MentionText>{l.text}</MentionText>
                        </p>
                      ) : (
                        <MarkdownView className="mt-1.5 text-ink" compact>
                          {l.text}
                        </MarkdownView>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
