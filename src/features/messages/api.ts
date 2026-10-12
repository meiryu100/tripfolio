"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meKey } from "@/features/auth/api";
import { api, qs } from "@/lib/api-client";
import type { Chat, ConversationSummary, Message, MessageFolder, UserSummary } from "@/lib/types";

export const chatKey = (username: string) => ["chat", username.toLowerCase()] as const;

/** Inbox or Requests; refreshed every 10s while open. */
export function useConversations(folder: MessageFolder) {
  return useQuery({
    queryKey: ["conversations", folder],
    queryFn: () => api.get<{ conversations: ConversationSummary[] }>(`/api/messages${qs({ folder })}`).then((r) => r.conversations),
    refetchInterval: 10_000,
  });
}

/** The latest messages with one person; polled every 4s while the tab is visible. */
export function useChat(username: string) {
  return useQuery({
    queryKey: chatKey(username),
    queryFn: () => api.get<{ chat: Chat }>(`/api/messages/with/${encodeURIComponent(username)}`).then((r) => r.chat),
    refetchInterval: 4_000,
    refetchIntervalInBackground: false,
    retry: (n, e) => (e as { status?: number }).status !== 404 && n < 2,
  });
}

export const loadEarlier = (username: string, before: string) =>
  api.get<{ chat: Chat }>(`/api/messages/with/${encodeURIComponent(username)}${qs({ before })}`).then((r) => r.chat);

function useRefreshMessages() {
  const qc = useQueryClient();
  return (username?: string) => {
    if (username) qc.invalidateQueries({ queryKey: chatKey(username) });
    qc.invalidateQueries({ queryKey: ["conversations"] });
    qc.invalidateQueries({ queryKey: meKey });
  };
}

/** Send, with the message showing instantly while it's on its way. */
export function useSendMessage(username: string, me: UserSummary) {
  const qc = useQueryClient();
  const refresh = useRefreshMessages();
  const key = chatKey(username);
  return useMutation({
    mutationFn: (body: string) =>
      api.post<{ message: Message }>(`/api/messages/with/${encodeURIComponent(username)}`, { body }).then((r) => r.message),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Chat>(key);
      const pending: Message = { id: `pending-${Date.now()}`, senderId: me.id, body, unsent: false, createdAt: new Date().toISOString() };
      if (prev) qc.setQueryData<Chat>(key, { ...prev, messages: [...prev.messages, pending] });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => refresh(username),
  });
}

export function useUnsend(username: string) {
  const qc = useQueryClient();
  const refresh = useRefreshMessages();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/messages/m/${id}`),
    onMutate: (id) =>
      qc.setQueryData<Chat>(chatKey(username), (c) =>
        c ? { ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, body: "", unsent: true } : m)) } : c,
      ),
    onSettled: () => refresh(username),
  });
}

export function useChatAction(username: string) {
  const refresh = useRefreshMessages();
  const qc = useQueryClient();
  const u = encodeURIComponent(username);
  return useMutation({
    mutationFn: (action: "accept" | "delete" | "block" | "unblock") =>
      action === "accept"
        ? api.post(`/api/messages/with/${u}/accept`)
        : action === "delete"
          ? api.delete(`/api/messages/with/${u}`)
          : action === "block"
            ? api.post(`/api/users/${u}/block`)
            : api.delete(`/api/users/${u}/block`),
    onSettled: () => {
      refresh(username);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["blocked"] });
      qc.invalidateQueries({ queryKey: ["follows"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export const reportUser = (username: string, input: { reason: string; details: string; messageId?: string }) =>
  api.post(`/api/messages/with/${encodeURIComponent(username)}/report`, input);

export function useBlocked() {
  return useQuery({
    queryKey: ["blocked"],
    queryFn: () => api.get<{ users: UserSummary[] }>("/api/me/blocked").then((r) => r.users),
  });
}

/** Instagram-style short times: "now", "5m", "3h", "2d", "4w". */
export function shortAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (7 * 86400))}w`;
}
