import { useEffect, useRef, useState } from "react";
import { ChatAPI, ChatMessage } from "../../api/chat";
import { getCurrentUserId } from "../../api/apiGateway";

// Опускаемый блок-чат для inline-встраивания в карточку application/task/quest.
// Polling каждые 5 секунд (только когда раскрыт), без WebSocket — простой и устойчивый.
// Никаких WS, ничего, что упадёт от первой потерянной TLS-сессии.
export default function ChatPanel({
  threadId,
  title = "Чат",
  collapsedDefault = true,
}: {
  threadId: string;
  title?: string;
  collapsedDefault?: boolean;
}) {
  const [open, setOpen] = useState<boolean>(!collapsedDefault);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const myId = useRef<string>(getCurrentUserId());
  const scrollerRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    try {
      const res = await ChatAPI.list(threadId, { limit: 100 });
      setMessages(res.messages);
      setError("");
    } catch (e: any) {
      // Гасим 403 как «нет доступа»; остальное — показываем.
      const msg = e?.error || e?.message || "Ошибка чата";
      if (!String(msg).toLowerCase().includes("not a participant")) {
        setError(String(msg));
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    void fetchMessages();
    const t = window.setInterval(() => void fetchMessages(), 5000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, threadId]);

  useEffect(() => {
    // Автоскролл вниз при новых сообщениях.
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const m = await ChatAPI.send(threadId, body);
      setMessages((prev) => [...prev, m]);
      setText("");
    } catch (e: any) {
      setError(e?.error || e?.message || "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12, borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        {open ? `${title} ▴` : `${title} ▾`}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {error && <div className="error" style={{ fontSize: 12 }}>{error}</div>}
          <div
            ref={scrollerRef}
            style={{
              maxHeight: 220,
              overflowY: "auto",
              padding: 8,
              background: "var(--surface-soft)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {messages.length === 0 && (
              <div className="muted" style={{ fontSize: 12 }}>
                Сообщений пока нет. Напишите первое — собеседнику придёт уведомление при следующем опросе.
              </div>
            )}
            {messages.map((m) => {
              const mine = m.from_user_id === myId.current;
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "78%",
                    padding: "6px 10px",
                    background: mine ? "var(--brand-soft)" : "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    whiteSpace: "pre-wrap",
                    fontSize: 13,
                  }}
                  title={new Date(m.created_at).toLocaleString()}
                >
                  {m.body}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="mj-vac-input"
              placeholder="Сообщение…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn--primary" disabled={busy || !text.trim()} onClick={handleSend}>
              {busy ? "…" : "Отправить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
