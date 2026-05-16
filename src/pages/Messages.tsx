import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../assets/styles/global.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { ChatAPI, ChatMessage, ChatThread, ThreadKind } from "../api/chat";
import { getCurrentUserId } from "../api/apiGateway";

// Двухколоночный inbox а-ля hh.ru: слева список тредов, справа активная переписка.
// Polling сообщений активного треда каждые 5 секунд (без WS).
export default function Messages() {
  const [params, setParams] = useSearchParams();
  const initialThread = params.get("thread") || "";

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [activeId, setActiveId] = useState<string>(initialThread);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const myId = useRef<string>(getCurrentUserId());
  const scrollerRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => threads.find((t) => t.thread_id === activeId), [threads, activeId]);

  async function loadThreads() {
    setLoadingThreads(true);
    try {
      const ts = await ChatAPI.listThreads();
      setThreads(ts);
      // Если активного нет — пробуем подсветить первый.
      if (!activeId && ts.length > 0) {
        setActiveId(ts[0].thread_id);
        setParams({ thread: ts[0].thread_id }, { replace: true });
      }
    } catch {
      // empty
    } finally {
      setLoadingThreads(false);
    }
  }

  async function loadMessages(threadID: string) {
    try {
      const parts = threadID.split(":");
      if (parts.length !== 2) return;
      const res = await ChatAPI.list(parts[0] as ThreadKind, parts[1], { limit: 100 });
      setMessages(res.messages);
    } catch {
      setMessages([]);
    }
  }

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    const t = window.setInterval(() => void loadMessages(activeId), 5000);
    return () => window.clearInterval(t);
  }, [activeId]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend() {
    const body = text.trim();
    if (!body || !activeId) return;
    const parts = activeId.split(":");
    if (parts.length !== 2) return;
    setSending(true);
    try {
      const m = await ChatAPI.send(parts[0] as ThreadKind, parts[1], body);
      setMessages((prev) => [...prev, m]);
      setText("");
      // Обновляем preview в списке тредов.
      setThreads((arr) =>
        arr.map((t) =>
          t.thread_id === activeId
            ? { ...t, last_message: m.body, last_at: m.created_at }
            : t
        )
      );
    } catch {
      // empty
    } finally {
      setSending(false);
    }
  }

  function selectThread(id: string) {
    setActiveId(id);
    setParams({ thread: id }, { replace: true });
  }

  function kindLabel(k?: string) {
    if (k === "task") return "Задача";
    if (k === "quest") return "Квест";
    if (k === "application") return "Отклик";
    return "Тред";
  }

  return (
    <>
      <Header />
      <main className="page-wide" style={{ paddingTop: 24, paddingBottom: 32 }}>
        <h1 className="page-title" style={{ marginBottom: 12 }}>Сообщения</h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 360px) 1fr",
            gap: 16,
            height: "calc(100vh - 200px)",
            minHeight: 480,
          }}
        >
          {/* Левая колонка — список тредов */}
          <aside
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              background: "var(--surface)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
              Диалоги {loadingThreads ? "…" : `(${threads.length})`}
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {threads.length === 0 && !loadingThreads && (
                <div className="muted" style={{ padding: 14, fontSize: 13 }}>
                  Пока нет диалогов. Откройте отклик или задачу и напишите первое сообщение —
                  тред появится здесь у обоих собеседников.
                </div>
              )}
              {threads.map((t) => {
                const isActive = t.thread_id === activeId;
                return (
                  <button
                    key={t.thread_id}
                    type="button"
                    onClick={() => selectThread(t.thread_id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: isActive ? "var(--brand-soft)" : "transparent",
                      border: 0,
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {t.peer_name || "Собеседник"}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {t.last_at ? new Date(t.last_at).toLocaleDateString() : ""}
                      </div>
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {kindLabel(t.kind)}
                      {t.context_title ? ` · ${t.context_title}` : ""}
                      {t.peer_role ? ` · ${t.peer_role}` : ""}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: 0.85,
                      }}
                    >
                      {t.last_message || "…"}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Правая колонка — активный диалог */}
          <section
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {!active ? (
              <div className="empty-state" style={{ margin: "auto" }}>
                <p>Выберите диалог слева.</p>
              </div>
            ) : (
              <>
                <header
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "var(--font-display)" }}>
                      {active.peer_name || "Собеседник"}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {active.peer_role || ""}
                      {active.peer_company ? ` · ${active.peer_company}` : ""}
                      {active.context_title ? ` · ${kindLabel(active.kind)}: «${active.context_title}»` : ""}
                    </div>
                  </div>
                  {active.peer_id && (
                    <Link to={`/u/${encodeURIComponent(active.peer_id)}`} className="btn btn--ghost">
                      Профиль →
                    </Link>
                  )}
                </header>

                <div
                  ref={scrollerRef}
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    background: "var(--surface-soft)",
                  }}
                >
                  {messages.length === 0 && (
                    <div className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 24 }}>
                      Сообщений ещё нет — напишите первое.
                    </div>
                  )}
                  {messages.map((m) => {
                    const mine = m.from_user_id === myId.current;
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: mine ? "flex-end" : "flex-start",
                          maxWidth: "70%",
                          padding: "8px 12px",
                          background: mine ? "var(--brand-soft)" : "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          whiteSpace: "pre-wrap",
                          fontSize: 14,
                        }}
                        title={new Date(m.created_at).toLocaleString()}
                      >
                        {m.body}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    padding: 10,
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    className="mj-vac-input"
                    placeholder="Сообщение… (Enter — отправить)"
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
                  <button type="button" className="btn btn--primary" disabled={sending || !text.trim()} onClick={handleSend}>
                    {sending ? "…" : "Отправить"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
