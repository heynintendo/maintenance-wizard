import { useState } from 'react';

import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { useAuth } from '@/auth/AuthContext';
import { Button, useToast } from '@/components/ui';
import { useSubmitFeedback } from '@/hooks/mutations';

interface FeedbackFormProps {
  targetType: string;
  targetId?: string;
  disabled?: boolean;
}

export function FeedbackForm({ targetType, targetId, disabled }: FeedbackFormProps) {
  const { user } = useAuth();
  const submit = useSubmitFeedback();
  const { toast } = useToast();
  const [choice, setChoice] = useState<'up' | 'down' | null>(null);
  const [notes, setNotes] = useState('');

  if (disabled) {
    return <p className="text-sm text-ink-muted">Your role has read-only access here.</p>;
  }

  function send(kind: 'up' | 'down') {
    setChoice(kind);
    submit.mutate(
      {
        target_type: targetType,
        target_id: targetId ?? null,
        feedback_type: kind === 'up' ? 'positive' : 'negative',
        rating: kind === 'up' ? 5 : 1,
        notes: notes || null,
        author_user_id: user?.user_id ?? null,
      },
      {
        onSuccess: () => {
          toast('Feedback recorded. It will condition future analysis.', 'success');
          setNotes('');
        },
        onError: (e) => toast(e instanceof Error ? e.message : 'Feedback failed', 'error'),
      },
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Optional correction or note for the agent…"
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={choice === 'up' ? 'primary' : 'secondary'}
          onClick={() => send('up')}
          loading={submit.isPending && choice === 'up'}
        >
          <ThumbsUp className="h-4 w-4" /> Helpful
        </Button>
        <Button
          size="sm"
          variant={choice === 'down' ? 'danger' : 'secondary'}
          onClick={() => send('down')}
          loading={submit.isPending && choice === 'down'}
        >
          <ThumbsDown className="h-4 w-4" /> Needs work
        </Button>
      </div>
    </div>
  );
}
