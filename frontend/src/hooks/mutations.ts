import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { FeedbackRequest, PollRequest } from '@/lib/types';

export function useAckAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.ackAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useUpdateTicketStatus(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: string; note?: string }) => api.updateTicketStatus(ticketId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.ticket(ticketId) });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useAddTimelineNote(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => api.addTimelineNote(ticketId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ticket(ticketId) }),
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FeedbackRequest) => api.submitFeedback(body),
    onSuccess: (_data, vars) => {
      if (vars.target_type === 'ticket' && vars.target_id) {
        qc.invalidateQueries({ queryKey: qk.ticket(vars.target_id) });
      }
    },
  });
}

export function useGenerateReport() {
  return useMutation({ mutationFn: (equipmentId: string) => api.generateReport(equipmentId) });
}

export function useRunPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PollRequest) => api.runPoll(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: qk.proactiveState });
    },
  });
}

export function useResetProactive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.resetProactive(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proactiveState });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
