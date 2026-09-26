import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchConversations, fetchMessages, fetchUnreadMessageCount, sendMessage } from './api';

export const CHAT_QUERY_KEY = ['chat', 'conversations'] as const;
export const CHAT_UNREAD_KEY = ['chat', 'unread-count'] as const;

export function useConversations(role?: string) {
  return useQuery({
    queryKey: ['chat', 'conversations', role],
    queryFn: () => fetchConversations(role),
    refetchInterval: 5000, // 5s auto polling for live messages
  });
}

export function useUnreadMessageCount(role?: string) {
  return useQuery({
    queryKey: [...CHAT_UNREAD_KEY, role || 'all'],
    queryFn: async () => {
      // 1. Primary: fetch dedicated unread counter
      const totalFromApi = await fetchUnreadMessageCount(role);
      if (totalFromApi > 0) return totalFromApi;

      // 2. Fallback: calculate sum from active conversations
      try {
        const conversations = await fetchConversations(role);
        return conversations.reduce((sum, c) => {
          const u = typeof c.unreadCount === 'number' ? c.unreadCount : 0;
          return sum + (u || 0);
        }, 0);
      } catch (e) {
        return totalFromApi;
      }
    },
    refetchInterval: 5000, // 5s live polling for instant message alert notifications
    staleTime: 1000 * 3,
  });
}

export function useChatMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => (conversationId ? fetchMessages(conversationId) : Promise.resolve([])),
    enabled: !!conversationId,
    refetchInterval: 3000, // 3s polling for real-time thread messages
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
    },
  });
}

