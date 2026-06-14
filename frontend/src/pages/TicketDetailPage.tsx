import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '@/auth/AuthContext';
import { canDo } from '@/auth/roles';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { PageHeader } from '@/components/shell/PageHeader';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  MarkdownView,
  SeverityBadge,
  Skeleton,
  StatusBadge,
  useToast,
} from '@/components/ui';
import { FeedbackForm } from '@/components/domain/FeedbackForm';
import { FindingCard } from '@/components/domain/FindingCard';
import { MentionInput } from '@/components/domain/MentionInput';
import { ProvenanceList } from '@/components/domain/Provenance';
import { TicketTimeline } from '@/components/domain/TicketTimeline';
import { useAddTimelineNote, useUpdateTicketStatus } from '@/hooks/mutations';
import { useTicket } from '@/hooks/queries';
import { formatDateTime, titleCase } from '@/lib/format';
import { STATUS_TRANSITIONS, type TicketStatus } from '@/lib/severity';

export default function TicketDetailPage() {
  const { id = '' } = useParams();
  const ticket = useTicket(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const updateStatus = useUpdateTicketStatus(id);
  const addNote = useAddTimelineNote(id);
  const [note, setNote] = useState('');

  const canWrite = canDo(user?.role, 'ticket_write');
  const canFeedback = canDo(user?.role, 'submit_feedback');

  if (ticket.isLoading) {
    return (
      <>
        <PageHeader title="Loading…" />
        <div className="p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }
  if (ticket.error || !ticket.data) {
    return (
      <>
        <PageHeader title="Ticket" />
        <ErrorState message="Could not load this ticket." onRetry={() => ticket.refetch()} />
      </>
    );
  }

  const t = ticket.data;
  const transitions = STATUS_TRANSITIONS[t.status as TicketStatus] ?? [];

  function transition(to: string) {
    updateStatus.mutate(
      { status: to },
      {
        onSuccess: () => toast(`Moved to ${titleCase(to)}`, 'success'),
        onError: (e) => toast(e instanceof Error ? e.message : 'Transition failed', 'error'),
      },
    );
  }

  function submitNote() {
    if (!note.trim()) return;
    addNote.mutate(note.trim(), {
      onSuccess: () => {
        setNote('');
        toast('Note added', 'success');
      },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not add note', 'error'),
    });
  }

  return (
    <>
      <PageHeader
        title={t.title}
        description={`${t.equipment_id} · ${titleCase(t.kind)}`}
        breadcrumb={<Breadcrumb items={[{ label: 'Tickets', to: '/tickets' }, { label: t.ticket_id }]} />}
        actions={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={t.severity} />
            <StatusBadge status={t.status} />
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Analysis" subtitle={`Opened ${formatDateTime(t.created_at)}`} />
            <CardBody className="space-y-4">
              {t.answer ? (
                <MarkdownView>{t.answer}</MarkdownView>
              ) : (
                <p className="text-sm text-ink-muted">No analysis attached.</p>
              )}
              {t.provenance?.length > 0 && <ProvenanceList sources={t.provenance} />}
            </CardBody>
          </Card>

          {t.findings?.length > 0 && (
            <Card>
              <CardHeader title="Specialist findings" />
              <CardBody className="space-y-3">
                {t.findings.map((f, i) => (
                  <FindingCard key={i} finding={f} />
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Lifecycle" />
            <CardBody className="space-y-3">
              {canWrite ? (
                transitions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {transitions.map((to) => (
                      <Button
                        key={to}
                        size="sm"
                        variant="secondary"
                        onClick={() => transition(to)}
                        loading={updateStatus.isPending}
                      >
                        {titleCase(to)}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">No further transitions.</p>
                )
              ) : (
                <p className="text-sm text-ink-muted">Lifecycle is read-only for your role.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody className="space-y-4">
              <TicketTimeline items={t.timeline} />
              {canWrite && (
                <div className="space-y-2 border-t border-hairline pt-3">
                  <MentionInput
                    value={note}
                    onChange={setNote}
                    rows={2}
                    placeholder="Add a note… (type @ to mention someone)"
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <Button size="sm" onClick={submitNote} loading={addNote.isPending} disabled={!note.trim()}>
                    Add note
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Feedback" subtitle="Conditions future analysis (FR6)" />
            <CardBody className="space-y-3">
              {t.feedback?.length > 0 && (
                <ul className="space-y-1 text-xs text-ink-muted">
                  {t.feedback.map((f, i) => (
                    <li key={i}>
                      · {f.feedback_type}
                      {f.notes ? `: ${f.notes}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              <FeedbackForm targetType="ticket" targetId={t.ticket_id} disabled={!canFeedback} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
