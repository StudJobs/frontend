import { useEffect, useRef, useState } from "react";
import { ChatAPI } from "../../api/chat";
import { ApplicationsAPI } from "../../api/applications";
import { TasksAPI, SUBMISSION_STATUS, TASK_STATUS } from "../../api/tasks";
import { VacanciesAPI } from "../../api/vacancies";
import { MembershipAPI } from "../../api/membership";
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
  | "microtask_deadline"
  | "vacancy_status"
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
// DISMISSED_KEY — ids уведомлений, которые юзер скрыл «крестиком». Хранятся в
// localStorage с TTL 30 дней (id уведомления стабилен в рамках сущности —
// chat-thread, application и т.д. — иначе скрытие тут же бы воскресло).
const DISMISSED_KEY = "sj_notif_dismissed";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getLastSeen(): number {
  const v = localStorage.getItem(LAST_SEEN_KEY);
  const t = v ? Date.parse(v) : 0;
  return Number.isFinite(t) && t > 0 ? t : 0;
}

type DismissedMap = Record<string, number>;
function getDismissed(): DismissedMap {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const m = JSON.parse(raw) as DismissedMap;
    // Чистим протухшие, чтобы карта не пухла бесконечно.
    const now = Date.now();
    const out: DismissedMap = {};
    for (const [k, t] of Object.entries(m)) {
      if (typeof t === "number" && now - t < DISMISS_TTL_MS) out[k] = t;
    }
    return out;
  } catch {
    return {};
  }
}
function setDismissed(m: DismissedMap) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(m));
  } catch {
    /* quota — ignore */
  }
}

function useLiveNotifications(): {
  items: SjNotification[];
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  hasNew: boolean;
  ack: () => void;
} {
  const [items, setItems] = useState<SjNotification[]>([]);
  // hasNew → bell пульсирует. Снимается через ack() при открытии шторки.
  const [hasNew, setHasNew] = useState(false);
  const lastMaxTsRef = useRef<number>(0);

  async function tick() {
    const role = localStorage.getItem("role") || "";
    const me = getCurrentUserId();
    const lastSeen = getLastSeen();
    const acc: SjNotification[] = [];

    // 1) Чаты: последние сообщения от собеседника. Своих не показываем —
    // ты сам только что отправил, не нужно тебе об этом напоминать.
    //
    // FIXME(notifications-realtime): сейчас опрашиваем ChatAPI.listThreads()
    // на каждый tick колокольчика (interval, см. ниже). Это «работает», но:
    //   — задержка до 5–10 сек;
    //   — N+1 на каждого пользователя при росте тредов;
    //   — нет события «прислали DM пока ты не на сайте».
    // Хорошее решение: вынести шину сообщений в Kafka (или Redis Pub/Sub),
    // в API-Gateway повесить SSE/WS-эндпоинт `/notifications/stream`, бэкенд
    // Chat-сервиса публикует событие при INSERT в chat_messages — клиент
    // подписывается на свой канал по userID и получает push мгновенно.
    // Решение отложено по решению автора (диплом-MVP) — вернёмся, когда даст добро.
    try {
      const threads = await ChatAPI.listThreads();
      for (const t of threads) {
        if (!t.last_at || !t.last_message) continue;
        if (t.last_from_user_id && me && t.last_from_user_id === me) continue;
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

      // Дедлайны взятых в работу микрозадач — напоминаем, когда осталось ≤3 дней.
      // Уведомление считается непрочитанным, пока юзер не нажал «прочитать всё».
      try {
        const assigned = await TasksAPI.listMyAssigned({ status: TASK_STATUS.ASSIGNED, limit: 50 });
        const now = Date.now();
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
        for (const t of assigned.tasks || []) {
          if (!t.deadline) continue;
          const dl = Date.parse(t.deadline);
          if (!dl) continue;
          const left = dl - now;
          if (left > THREE_DAYS) continue;
          const overdue = left < 0;
          const days = Math.max(0, Math.ceil(left / (24 * 60 * 60 * 1000)));
          // ts — это сам дедлайн; «свежесть» уведомления определяется приближением.
          // Чтобы оно не «застывало», ts двигаем близко к now (минута назад), это
          // выводит дедлайн-напоминание наверх списка.
          acc.push({
            id: "deadline-" + t.id,
            kind: "microtask_deadline",
            title: overdue
              ? `Просрочено: ${t.title}`
              : days === 0
              ? `Сегодня дедлайн: ${t.title}`
              : `Через ${days} дн. дедлайн: ${t.title}`,
            body: `Срок: ${new Date(dl).toLocaleString()}`,
            ts: new Date(now - 60_000).toISOString(),
            read: false,
            link: "/my/applications",
          });
        }
      } catch {
        // ignore
      }

      // Изменения статуса вакансии у активных откликов (paused / closed).
      // Тянем вакансии только для откликов в состоянии PENDING/ACCEPTED — не имеет
      // смысла напоминать про отклонённые. Кеш в localStorage по id вакансии,
      // уведомление приходит только при смене значения.
      try {
        const apps = await ApplicationsAPI.listMine({ limit: 50 });
        const cacheKey = "sj_vacancy_status_cache";
        let cache: Record<string, string> = {};
        try {
          cache = JSON.parse(localStorage.getItem(cacheKey) || "{}") || {};
        } catch {
          cache = {};
        }
        const next: Record<string, string> = { ...cache };
        const seen = new Set<string>();
        for (const a of apps.applications) {
          if (a.status === 3) continue; // отклонён — не интересует
          if (seen.has(a.vacancy_id)) continue;
          seen.add(a.vacancy_id);
          try {
            const v = await VacanciesAPI.get(a.vacancy_id);
            if (!v) continue;
            const cur = (v.position_status || "").toLowerCase();
            next[a.vacancy_id] = cur;
            const prev = cache[a.vacancy_id];
            // Уведомляем, когда статус стал НЕ "open" и изменился относительно
            // того, что было в прошлый раз. Для первого захода сравниваем с "open" —
            // показываем только если вакансия уже не открыта.
            const prevWas = prev ?? "open";
            if (cur && cur !== "open" && cur !== prevWas) {
              const title =
                cur === "paused" || cur === "pause"
                  ? `Вакансия приостановлена: ${v.title || ""}`
                  : cur === "closed" || cur === "close"
                  ? `Вакансия закрыта: ${v.title || ""}`
                  : `Статус вакансии изменён: ${v.title || ""} (${cur})`;
              acc.push({
                id: "vacstatus-" + a.vacancy_id + "-" + cur,
                kind: "vacancy_status",
                title,
                body: "Ваш отклик может остаться без рассмотрения",
                ts: new Date().toISOString(),
                read: false,
                link: "/my/applications",
              });
            }
          } catch {
            // ignore single vacancy
          }
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          // ignore quota
        }
      } catch {
        // ignore
      }
    }

    // 3) Для HR/EMPLOYER — статусы membership-заявок в компании.
    // Owner одобрил или отклонил — HR должен это увидеть в шторке колокольчика.
    // Кэш по membership_id в localStorage, уведомление приходит при смене статуса.
    if (role === "ROLE_EMPLOYER") {
      try {
        const mem = await MembershipAPI.my();
        if (mem && mem.id) {
          const cacheKey = "sj_membership_status_cache";
          let prev = "";
          try {
            prev = localStorage.getItem(cacheKey + ":" + mem.id) || "";
          } catch {
            /* ignore */
          }
          const curStatus = String(mem.status || 0);
          // 2 = APPROVED, 3 = REJECTED. PENDING (1) — без уведомления.
          if ((mem.status === 2 || mem.status === 3) && prev !== curStatus) {
            const approved = mem.status === 2;
            acc.push({
              id: "membership-" + mem.id + "-" + curStatus,
              kind: "system",
              title: approved
                ? "Заявка в компанию одобрена"
                : "Заявка в компанию отклонена",
              body: approved
                ? "Теперь вы можете создавать вакансии и микрозадачи от имени компании."
                : "Свяжитесь с владельцем компании или подайте новую заявку.",
              ts: mem.reviewed_at || new Date().toISOString(),
              read: false,
              link: "/hr-membership",
            });
            try {
              localStorage.setItem(cacheKey + ":" + mem.id, curStatus);
            } catch {
              /* ignore */
            }
          } else if (!prev) {
            // первый просмотр — сохраняем чтобы не «зарядить» уведомление на нескольких тиках
            try {
              localStorage.setItem(cacheKey + ":" + mem.id, curStatus);
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // De-dup по id + фильтрация скрытых юзером + сортировка свежее сверху.
    const dismissed = getDismissed();
    const map = new Map<string, SjNotification>();
    for (const n of acc) {
      if (dismissed[n.id]) continue;
      map.set(n.id, n);
    }
    const sorted = [...map.values()].sort(
      (a, b) => Date.parse(b.ts) - Date.parse(a.ts)
    );
    const top = sorted.slice(0, 30);

    // Детектим «прилетело новое» — для пульсации колокольчика. Сравниваем
    // максимальный ts с предыдущим тиком; если выше — поднимаем флаг.
    const maxTs = top.reduce((m, n) => Math.max(m, Date.parse(n.ts) || 0), 0);
    if (lastMaxTsRef.current > 0 && maxTs > lastMaxTsRef.current) {
      setHasNew(true);
    }
    lastMaxTsRef.current = maxTs;

    setItems(top);
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

  function dismiss(id: string) {
    const m = getDismissed();
    m[id] = Date.now();
    setDismissed(m);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  function clearAll() {
    const m = getDismissed();
    items.forEach((n) => {
      m[n.id] = Date.now();
    });
    setDismissed(m);
    setItems([]);
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  }

  function ack() {
    setHasNew(false);
  }

  return { items, markAllRead, dismiss, clearAll, hasNew, ack };
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
  microtask_deadline: "Дедлайн",
  vacancy_status: "Вакансия",
  system: "Платформа",
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { items, markAllRead, dismiss, clearAll, hasNew, ack } = useLiveNotifications();
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    // Открыли панель — считаем что юзер всё увидел, и снимаем пульсацию.
    markAllRead();
    ack();
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Пульсирующая подсветка: класс держим всегда пока есть unread, чтобы юзер
  // не пропустил уведомление — но как только открыл шторку, ack() снимает hasNew
  // и markAllRead() обнуляет unread → bell перестаёт пульсировать.
  const pulse = hasNew || unread > 0;

  return (
    <div className="sj-bell" ref={wrapRef}>
      <button
        type="button"
        className={"sj-bell__btn" + (pulse ? " sj-bell__btn--pulse" : "")}
        onClick={() => setOpen((s) => !s)}
        aria-label={`Уведомления${unread ? ` (${unread} новых)` : ""}`}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="sj-bell__dot" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="sj-bell__panel" role="menu">
          <div className="sj-bell__head">
            <span className="eyebrow">Уведомления</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {unread > 0 && (
                <button type="button" className="sj-bell__markread" onClick={markAllRead}>
                  Прочитать все
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  className="sj-bell__markread"
                  onClick={clearAll}
                  title="Скрыть все уведомления"
                  style={{ color: "var(--ink-muted)" }}
                >
                  Очистить
                </button>
              )}
            </div>
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
                  <button
                    type="button"
                    className="sj-bell__dismiss"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(n.id);
                    }}
                    aria-label="Скрыть уведомление"
                    title="Скрыть"
                  >
                    ×
                  </button>
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
