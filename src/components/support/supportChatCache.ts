import type { QueryClient } from '@tanstack/react-query';
import type { SupportTicketMessageRow } from '@/lib/api';

/** Poll interval while a ticket thread is open (near real-time without websockets). */
export const SUPPORT_CHAT_POLL_MS = 2_500;

type TicketDetailWithMessages = {
  messages: SupportTicketMessageRow[];
  last_activity_at?: string;
};

/** Append a sent message to the ticket detail cache immediately after POST succeeds. */
export function appendSupportTicketMessageToCache(
  qc: QueryClient,
  detailQueryKey: readonly unknown[],
  message: SupportTicketMessageRow,
) {
  qc.setQueryData<TicketDetailWithMessages | undefined>(detailQueryKey, (old) => {
    if (!old) return old;
    if (old.messages.some((m) => m.id === message.id)) return old;
    return {
      ...old,
      messages: [...old.messages, { ...message, attachments: message.attachments ?? [] }],
      last_activity_at: message.created_at,
    };
  });
}
