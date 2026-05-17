import { useEffect, useRef, useState } from "react";
import { ChatAPI } from "../../api/chat";
import { ApplicationsAPI } from "../../api/applications";
import { TasksAPI, SUBMISSION_STATUS } from "../../api/tasks";
import { getCurrentUserId } from "../../api/apiGateway";

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

// LAST_SEEN_KEY — момент когда юзер последний раз открывал уведомления.
// События с ts > last_seen и не "моими" считаются непрочитанными.
const LAST_SEEN_KEY = "sj_notif_last_seen";

function getLastSeen(): number {
  const v = localStorage.getItem(LAST_SEEN_KEY);
  const t = v ? Date.parse(v) : 0;
  return Number.isFinite(t) && t > 0 ? t : 0;
}

function useLiveNotifications(): { items: SjNotification[]; markAllRead: () => void } {
  const [items, setItems] = useState<SjNotification[]>([]);

  async function tick() {
    const role = localStorage.getItem("role") || "";
    const me = getCurrentUserId();
    const lastSeen = getLastSeen();
    const acc: SjNotification[] = [];

    // 1) Чаты: последние сообщения от собеседника.
    try {
      const threads = await ChatAPI.listThreads();
      for (const t of threads) {
        if (!t.last_at || !t.last_message) continue;
        const ts = Date.parse(t.last_at);
        if (!ts) continue;
        const isUnread = ts > lastSeen;
        acc.push({
          id: "chat-" + t.thread_id,
          kind: "system",
          title: `Сообщение от ${t.peer_name || "собеседника"}`,
          body: t.last_message.slice(0, 120),
          ts: t.last_at,
          read: !isUnread,
          link: "/messages?thread=" + encodeURIComponent(t.thread_id),
        });
      }
    } catch {
      // ignore
    }

    // 2) Для студента — изменения статусов своих откликов.
    if (role === "ROLE_STUDENT") {
      try {
        const apps = await ApplicationsAPI.listMine({ limit: 50 });
        for (const a of apps.applications) {
          if (a.status === 1) continue; // PENDING — не уведомляем
          const ts = Date.parse(a.updated_at || a.created_at || "");
          if (!ts) continue;
          acc.push({
            id: "app-" + a.id,
            kind: "application_status",
            title: a.status === 2 ? "Отклик принят" : "Отклик отклонён",
            body: a.hr_comment || "",
            ts: a.updated_at || a.created_at,
            read: ts <= lastSeen,
            link: "/my/applications",
          });
        }
      } catch {
        // ignore
      }

      // submission'ы (статусы решений микрозадач).
      try {
        const subs = await TasksAPI.listMySubmissions();
        for (const s of subs.submissions || []) {
          if (s.status === SUBMISSION_STATUS.PENDING) continue;
          const ts = Date.parse(s.reviewed_at || s.submitted_at || "");
          if (!ts) continue;
          acc.push({
            id: "sub-" + s.id,
            kind: "microtask_review",
            title:
              s.status === SUBMISSION_STATUS.APPROVED
                ? "Микрозадача принята"
                : "Микрозадача отклонена",
            body: s.review_comment || "",
            ts: s.reviewed_at || s.submitted_at,
            read: ts <= lastSeen,
            link: "/my/applications",
          });
        }
      } catch {
        // ignore
      }
    }

    // De-dup по id + сортировка свежее сверху.
    const map = new Map<string, SjNotification>();
    for (const n of acc) map.set(n.id, n);
    const sorted = [...map.values()].sort(
      (a, b) => Date.parse(b.ts) - Date.parse(a.ts)
    );
    setItems(sorted.slice(0, 30));
    void me; // suppress unused
  }

  useEffect(() => {
    void tick();
    const i = window.setInterval(() => void tick(), 30_000);
    return () => window.clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markAllRead() {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return { items, markAllRead };
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
  const { items, markAllRead } = useLiveNotifications();
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    // Открыли панель — считаем что юзер всё увидел.
    markAllRead();
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <span className="mono subtle">обновляется каждые 30 секунд</span>
          </div>
        </div>
      )}
    </div>
  );
}
