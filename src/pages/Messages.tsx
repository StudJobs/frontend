import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../assets/styles/global.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { ChatAPI, ChatMessage, ChatThread, ThreadKind } from "../api/chat";
import { getCurrentUserId } from "../api/apiGateway";
import { UsersAPI } from "../api/users";

// Двухколоночный inbox а-ля hh.ru: слева список тредов, справа активная переписка.
// Polling сообщений активного треда каждые 5 секунд (без WS).
export default function Messages() {
  const [params, setParams] = useSearchParams();
  const initialThread = params.get("thread") || "";

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [activeId, setActiveId] = useState<string>(initialThread);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [accessError, setAccessError] = useState<string>("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string>(() => getCurrentUserId());
  // JWT-парсер достаёт user_uuid; но для пущей надёжности после mount тянем
  // /users/me — это авторитативный id, не зависит от формата payload.
  useEffect(() => {
    (async () => {
      try {
        const me = await UsersAPI.me();
        if (me?.id) setMyId(me.id);
      } catch {
        /* keep JWT-parsed id */
      }
    })();
  }, []);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Если активный тред пришёл по URL и его нет в списке от бэка — рендерим как
  // временный «локальный» элемент: юзер сразу видит вход в этот диалог в левой
  // колонке, не приходится ждать пока бэк его подтянет.
  const displayThreads = useMemo<ChatThread[]>(() => {
    if (!activeId || threads.some((t) => t.thread_id === activeId)) return threads;
    const parts = activeId.split(":");
    return [
      {
        thread_id: activeId,
        kind: parts[0],
        resource_id: parts[1] || "",
      } as ChatThread,
      ...threads,
    ];
  }, [threads, activeId]);

  const active = useMemo(() => displayThreads.find((t) => t.thread_id === activeId), [displayThreads, activeId]);

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

  async function loadMessages(threadID: string): Promise<boolean> {
    const parts = threadID.split(":");
    if (parts.length !== 2) return false;
    try {
      const res = await ChatAPI.list(parts[0] as ThreadKind, parts[1], { limit: 100 });
      setMessages(res.messages);
      setAccessError("");
      return true;
    } catch (e: any) {
      const msg = String(e?.error || e?.message || "").toLowerCase();
      if (msg.includes("participant") || msg.includes("forbidden") || msg.includes("not found")) {
        setAccessError(
          "У вас нет доступа к этому диалогу. Возможно, вы не участник отклика/задачи, " +
            "либо ваша заявка в компанию ещё не одобрена."
        );
        setMessages([]);
        return false; // прекращаем polling
      }
      setMessages([]);
      return true; // сетевая ошибка — продолжаем попытки
    }
  }

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setAccessError("");
    let cancelled = false;
    let timer: number | null = null;
    const tick = async () => {
      const ok = await loadMessages(activeId);
      if (cancelled || !ok) return;
      timer = window.setTimeout(tick, 5000);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
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
      // Обновляем preview в списке тредов; если треда ещё нет — перезагружаем
      // полный список (после первой отправки бэк сможет вернуть его через fallback).
      setThreads((arr) => {
        if (!arr.some((t) => t.thread_id === activeId)) {
          // тред появится после reloadThreads — здесь возвращаем как есть
          return arr;
        }
        return arr.map((t) =>
          t.thread_id === activeId
            ? { ...t, last_message: m.body, last_at: m.created_at }
            : t
        );
      });
      void loadThreads();
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

  // Понятное имя треда для шапки списка слева и right header.
  // peer_name пуст когда тред «новый» и собеседник ещё не определён (например,
  // HR не назначен на отклик). Подставляем контекстный fallback.
  function threadTitle(t: ChatThread | undefined): string {
    if (!t) return "Собеседник";
    if (t.peer_name) return t.peer_name;
    const ctx = t.context_title || kindLabel(t.kind);
    switch (t.kind) {
      case "application":
        return `Кандидат · ${ctx}`;
      case "task":
        return `Заказчик · ${ctx}`;
      case "quest":
        return `Эксперт · ${ctx}`;
    }
    return ctx;
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
              Диалоги {loadingThreads ? "…" : `(${displayThreads.length})`}
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {displayThreads.length === 0 && !loadingThreads && (
                <div className="muted" style={{ padding: 14, fontSize: 13 }}>
                  Пока нет диалогов. Откройте отклик или задачу и напишите первое сообщение —
                  тред появится здесь у обоих собеседников.
                </div>
              )}
              {displayThreads.map((t) => {
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
                        {threadTitle(t)}
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
            {!activeId ? (
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
                      {threadTitle(active)}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {active?.peer_role || ""}
                      {active?.peer_company ? ` · ${active.peer_company}` : ""}
                      {active?.context_title ? ` · ${kindLabel(active?.kind)}: «${active.context_title}»` : ""}
                      {!active && activeId.includes(":") && `Диалог: ${activeId}`}
                    </div>
                  </div>
                  {active?.peer_id && (
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
                  {accessError && (
                    <div
                      style={{
                        margin: "auto",
                        maxWidth: 460,
                        padding: 14,
                        background: "var(--danger-soft)",
                        border: "1px solid var(--danger)",
                        borderRadius: 10,
                        color: "var(--danger)",
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    >
                      {accessError}
                    </div>
                  )}
                  {!accessError && messages.length === 0 && (
                    <div className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 24 }}>
                      Сообщений ещё нет — напишите первое.
                    </div>
                  )}
                  {messages.map((m) => {
                    const mine = m.from_user_id === myId;
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

                {!accessError && (
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
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
