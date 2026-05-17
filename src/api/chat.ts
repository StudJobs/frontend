// Минимальный чат — polling без WebSocket.
// thread разбит на kind + rid: например, kind="task", rid="<UUID>".
// Доступ проверяется на стороне Gateway по участникам треда.
import { apiGateway } from "./apiGateway";

export type ChatMessage = {
  id: string;
  thread_id: string;
  from_user_id: string;
  body: string;
  created_at: string;
  edited_at?: string;
};

export type ChatMessageList = {
  messages: ChatMessage[];
  pagination?: { total?: number; pages?: number; current_page?: number };
};

export type ThreadKind = "application" | "task" | "quest";

const unwrap = (r: any) => r?.data ?? r ?? {};

export type ChatThread = {
  thread_id: string;
  kind?: "application" | "task" | "quest" | string;
  resource_id?: string;
  last_message?: string;
  last_at?: string;
  last_from_user_id?: string;
  unread_count?: number;
  peer_id?: string;
  peer_name?: string;
  peer_role?: string;
  peer_company?: string;
  peer_avatar_url?: string;
  context_title?: string;
};

export const ChatAPI = {
  async list(kind: ThreadKind, rid: string, params?: { page?: number; limit?: number }): Promise<ChatMessageList> {
    const data = unwrap(
      await apiGateway({
        method: "GET",
        url: `/chat/${kind}/${encodeURIComponent(rid)}`,
        params,
      })
    );
    return {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      pagination: data?.pagination,
    };
  },

  async listThreads(): Promise<ChatThread[]> {
    const data = unwrap(await apiGateway({ method: "GET", url: "/chat/threads" }));
    return Array.isArray(data?.threads) ? data.threads : [];
  },

  async send(kind: ThreadKind, rid: string, body: string): Promise<ChatMessage> {
    const data = unwrap(
      await apiGateway({
        method: "POST",
        url: `/chat/${kind}/${encodeURIComponent(rid)}`,
        data: { body },
      })
    );
    return data as ChatMessage;
  },

  // Редактировать своё сообщение (бэк проверит авторство).
  async editMessage(messageId: string, body: string): Promise<ChatMessage> {
    const data = unwrap(
      await apiGateway({
        method: "PATCH",
        url: `/chat/messages/${encodeURIComponent(messageId)}`,
        data: { body },
      })
    );
    return data as ChatMessage;
  },

  // Скрыть тред «у себя» — собеседник продолжает видеть, история не теряется.
  async hideThread(kind: ThreadKind, rid: string): Promise<void> {
    await apiGateway({ method: "DELETE", url: `/chat/${kind}/${encodeURIComponent(rid)}` });
  },
};
