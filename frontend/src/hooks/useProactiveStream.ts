import { useCallback, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { qk } from '@/lib/queryKeys';
import { streamPost } from '@/lib/sse';
import type { PollRequest, ProactiveFinal, ProactiveStreamEvent } from '@/lib/types';

import { applyTraceEvent, type TraceNode } from './trace';

// Streams POST /api/proactive/poll/stream: the autonomous self-diagnosis runs live
// (status -> tool events) then a final event with the outcomes + alerts. On the final
// it invalidates the alert/ticket/state queries so the fire-once banner picks it up.
export function useProactiveStream() {
  const qc = useQueryClient();
  const [trace, setTrace] = useState<TraceNode[]>([]);
  const [final, setFinal] = useState<ProactiveFinal | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stackRef = useRef<number[]>([]);

  const run = useCallback(
    (body: PollRequest) => {
      if (streaming) return;
      stackRef.current = [];
      setTrace([]);
      setFinal(null);
      setError(null);
      setStreaming(true);

      streamPost('/api/proactive/poll/stream', body, {
        onEvent: (raw) => {
          const ev = raw as ProactiveStreamEvent;
          if (ev.type === 'final') {
            setFinal(ev);
            setStreaming(false);
            qc.invalidateQueries({ queryKey: ['alerts'] });
            qc.invalidateQueries({ queryKey: ['tickets'] });
            qc.invalidateQueries({ queryKey: qk.proactiveState });
          } else if (ev.type === 'error') {
            setError(ev.message);
            setStreaming(false);
          } else {
            setTrace((t) => applyTraceEvent(t, stackRef.current, ev));
          }
        },
        onClose: () => setStreaming(false),
        onError: () => {
          setStreaming(false);
          setError('The stream was interrupted.');
        },
      });
    },
    [streaming, qc],
  );

  return { trace, final, streaming, error, run };
}
