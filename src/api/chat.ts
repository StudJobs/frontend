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
};

export type ChatMessageList = {
  messages: ChatMessage[];
  pagination?: { total?: number; pages?: number; current_page?: number };
};

export type ThreadKind = "application" | "task" | "quest";

const unwrap = (r: any) => r?.data ?? r ?? {};

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
};
