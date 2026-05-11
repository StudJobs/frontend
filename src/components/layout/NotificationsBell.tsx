import { useEffect, useRef, useState } from "react";

/* ============================================================================
   NotificationsBell — mock-уведомления с потенциалом
   --------------------------------------------------------------------------
   Сейчас данные генерируются клиентом по эвристикам (последние отклики,
   verified ачивки и т.д., если они есть в localStorage). Когда бэк получит
   эндпоинт `GET /user/notifications`, мы заменим `useMockNotifications` на
   реальный fetch + WebSocket-подписку — UI не меняется.

   Тип уведомления заранее спроектирован под бэк:
     { id, kind, title, body, ts, read }
   ============================================================================ */

export type NotifKind =
  | "application_status"
  | "achievement_review"
  | "microtask_review"
  | "system";

export interface SjNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body?: string;
  ts: string;     // ISO timestamp
  read: boolean;
  link?: string;
}

function useMockNotifications(): {
  items: SjNotification[];
  markAllRead: () => void;
} {
  const [items, setItems] = useState<SjNotification[]>([]);

  useEffect(() => {
    // Простая mock-лента, привязанная к роли. Не персистится между сессиями.
    const role = localStorage.getItem("role");
    const now = Date.now();
    const base: SjNotification[] = role === "ROLE_STUDENT"
      ? [
          {
            id: "n1",
            kind: "application_status",
            title: "Отклик принят",
            body: "Команда «Cloud Platform» позвала вас на интервью",
            ts: new Date(now - 1000 * 60 * 22).toISOString(),
            read: false,
            link: "/my/applications",
          },
          {
            id: "n2",
            kind: "achievement_review",
            title: "Достижение проверено",
            body: "Пет-проект «scheduler» подтверждён экспертом",
            ts: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
            read: false,
            link: "/profile",
          },
          {
            id: "n3",
            kind: "system",
            title: "Новые вакансии по вашему стеку",
            body: "Появилось 4 предложения с тегами go, postgres",
            ts: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
            read: true,
            link: "/vacancies",
          },
        ]
      : role === "ROLE_EMPLOYER"
      ? [
          {
            id: "n1",
            kind: "application_status",
            title: "Новый отклик",
            body: "Студент откликнулся на «Senior Go Engineer»",
            ts: new Date(now - 1000 * 60 * 11).toISOString(),
            read: false,
            link: "/hr",
          },
          {
            id: "n2",
            kind: "microtask_review",
            title: "Решение ждёт ревью",
            body: "Микрозадача «Service Mesh Latency Report» сдана",
            ts: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
            read: false,
            link: "/hr/tasks",
          },
        ]
      : role === "ROLE_EXPERT"
      ? [
          {
            id: "n1",
            kind: "achievement_review",
            title: "Очередь верификации",
            body: "12 достижений ожидают вашего ревью",
            ts: new Date(now - 1000 * 60 * 60).toISOString(),
            read: false,
            link: "/expert",
          },
        ]
      : [];
    setItems(base);
  }, []);

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return { items, markAllRead };
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return `${Math.floor(diff / 86400)} дн`;
}

const KIND_LABEL: Record<NotifKind, string> = {
  application_status: "Отклик",
  achievement_review: "Достижение",
  microtask_review: "Микрозадача",
  system: "Платформа",
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { items, markAllRead } = useMockNotifications();
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="sj-bell" ref={wrapRef}>
      <button
        type="button"
        className="sj-bell__btn"
        onClick={() => setOpen((s) => !s)}
        aria-label={`Уведомления${unread ? ` (${unread} новых)` : ""}`}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="sj-bell__dot" aria-hidden="true">{unread}</span>}
      </button>

      {open && (
        <div className="sj-bell__panel" role="menu">
          <div className="sj-bell__head">
            <span className="eyebrow">Уведомления</span>
            {unread > 0 && (
              <button type="button" className="sj-bell__markread" onClick={markAllRead}>
                Прочитать все
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="sj-bell__empty">
              <div className="sj-bell__empty-icon">·</div>
              <div>Пока всё спокойно</div>
              <div className="subtle" style={{ fontSize: 12, marginTop: 6 }}>
                Здесь появятся отклики, ревью и системные апдейты
              </div>
            </div>
          ) : (
            <ul className="sj-bell__list">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={"sj-bell__item" + (n.read ? "" : " sj-bell__item--unread")}
                  onClick={() => {
                    if (n.link) window.location.href = n.link;
                  }}
                >
                  <div className="sj-bell__item-row">
                    <span className="sj-bell__kind">{KIND_LABEL[n.kind]}</span>
                    <span className="sj-bell__time">{timeAgo(n.ts)}</span>
                  </div>
                  <div className="sj-bell__title">{n.title}</div>
                  {n.body && <div className="sj-bell__body">{n.body}</div>}
                </li>
              ))}
            </ul>
          )}

          <div className="sj-bell__footer">
            <span className="mono subtle">demo · бэк-эндпоинт в плане</span>
          </div>
        </div>
      )}
    </div>
  );
}
