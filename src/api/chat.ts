// Минимальный чат — polling без WebSocket.
// thread_id-формат: "application:<uuid>" | "task:<uuid>" | "quest:<uuid>".
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

const unwrap = (r: any) => r?.data ?? r ?? {};

export const ChatAPI = {
  async list(threadId: string, params?: { page?: number; limit?: number }): Promise<ChatMessageList> {
    const data = unwrap(
      await apiGateway({ method: "GET", url: `/chat/${encodeURIComponent(threadId)}`, params })
    );
    return {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      pagination: data?.pagination,
    };
  },

  async send(threadId: string, body: string): Promise<ChatMessage> {
    const data = unwrap(
      await apiGateway({
        method: "POST",
        url: `/chat/${encodeURIComponent(threadId)}`,
        data: { body },
      })
    );
    return data as ChatMessage;
  },
};

export const threadId = {
  application: (id: string) => `application:${id}`,
  task: (id: string) => `task:${id}`,
  quest: (id: string) => `quest:${id}`,
};
