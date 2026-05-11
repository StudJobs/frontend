import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/hr-dashboard.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import {
  TasksAPI,
  TASK_STATUS,
  SUBMISSION_STATUS,
  MicroTask,
  Submission,
  submissionStatusLabel,
} from "../api/tasks";
import { VacanciesAPI, VacancyItem } from "../api/vacancies";
import { ApplicationsAPI, Application } from "../api/applications";

/* ============================================================================
   HRDashboard — рабочий стол HR / владельца компании
   --------------------------------------------------------------------------
   Реальные данные (из бэка):
     - Активные вакансии: VacanciesAPI.listMine()
     - Микрозадачи и сабмишены: TasksAPI.listMine() + listSubmissions
     - Отклики на каждую вакансию: ApplicationsAPI.listForVacancy(vacancy.id)

   Mock-данные с потенциалом (до v1.0+):
     - Sparkline «отклики/сабмишены за 14 дней»
     - Топ навыков среди откликнувшихся
     - Воронка conversion (views → apply → interview)
   Заглушки построены так, что замена на реальные эндпоинты — линейная
   замена useState на useEffect+fetch. См. ROADMAP.md.
   ============================================================================ */

type ActivityItem = {
  id: string;
  kind: "submission" | "application";
  title: string;
  subtitle: string;
  time: string;
  statusLabel: string;
  statusVariant: "pending" | "approved" | "rejected" | "default";
};

const safeHostname = (url?: string): string => {
  if (!url) return "—";
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.length > 32 ? `${url.slice(0, 32)}…` : url; }
};

const formatRelative = (ts?: string): string => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} дн`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const submissionVariant = (s?: number): ActivityItem["statusVariant"] => {
  switch (s) {
    case SUBMISSION_STATUS.PENDING: return "pending";
    case SUBMISSION_STATUS.APPROVED: return "approved";
    case SUBMISSION_STATUS.REJECTED: return "rejected";
    default: return "default";
  }
};

const applicationVariant = (s: number): ActivityItem["statusVariant"] => {
  switch (s) {
    case 1: return "pending";
    case 2: return "approved";
    case 3: return "rejected";
    default: return "default";
  }
};

export default function HRDashboard() {
  const [activeVacancies, setActiveVacancies] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);
  const [pendingSubs, setPendingSubs] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);
  const [vacancyApps, setVacancyApps] = useState<Array<{ vac: VacancyItem; count: number; pending: number }>>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const [vacancies, tasksResp] = await Promise.all([
          VacanciesAPI.listMine().catch(() => [] as VacancyItem[]),
          TasksAPI.listMine().catch(() => ({ tasks: [] as MicroTask[] })),
        ]);

        const tasks = tasksResp.tasks || [];
        if (cancelled) return;

        // Подгружаем отклики по каждой вакансии (для топ-секции и метрик).
        const appsByVacancy = await Promise.all(
          vacancies.map((v) =>
            ApplicationsAPI.listForVacancy(v.id, { limit: 50 })
              .then((r) => ({ vac: v, items: r.applications }))
              .catch(() => ({ vac: v, items: [] as Application[] }))
          )
        );

        // Сабмишены только по ASSIGNED/COMPLETED задачам.
        const tasksWithSubs = tasks.filter(
          (t) => t.status === TASK_STATUS.ASSIGNED || t.status === TASK_STATUS.COMPLETED
        );
        const subsResults = await Promise.all(
          tasksWithSubs.map((t) =>
            TasksAPI.listSubmissions(t.id)
              .then((r) => ({ task: t, subs: r.submissions || [] }))
              .catch(() => ({ task: t, subs: [] as Submission[] }))
          )
        );

        if (cancelled) return;

        const _activeVacancies = vacancies.length;
        const _openTasks = tasks.filter(
          (t) => t.status === TASK_STATUS.OPEN || t.status === TASK_STATUS.ASSIGNED
        ).length;

        let _pendingSubs = 0;
        let _pendingApps = 0;
        const allEvents: Array<{ ts: number; item: ActivityItem }> = [];

        for (const { vac, items } of appsByVacancy) {
          for (const a of items) {
            if (a.status === 1) _pendingApps++;
            const ts = new Date(a.created_at).getTime() || 0;
            allEvents.push({
              ts,
              item: {
                id: `app-${a.id}`,
                kind: "application",
                title: vac.title || "Вакансия",
                subtitle: `Отклик · ${a.student_id.slice(0, 8)}`,
                time: formatRelative(a.created_at),
                statusLabel: a.status === 1 ? "Ожидает" : a.status === 2 ? "Принят" : "Отклонён",
                statusVariant: applicationVariant(a.status),
              },
            });
          }
        }

        for (const { task, subs } of subsResults) {
          for (const sub of subs) {
            if (sub.status === SUBMISSION_STATUS.PENDING) _pendingSubs++;
            const ts = sub.submitted_at ? new Date(sub.submitted_at).getTime() : 0;
            allEvents.push({
              ts,
              item: {
                id: `sub-${sub.id}`,
                kind: "submission",
                title: task.title,
                subtitle: `Решение · ${safeHostname(sub.solution_url)}`,
                time: formatRelative(sub.submitted_at),
                statusLabel: submissionStatusLabel(sub.status),
                statusVariant: submissionVariant(sub.status),
              },
            });
          }
        }

        const sortedActivity = allEvents
          .filter((e) => e.ts > 0)
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 12)
          .map((e) => e.item);

        setActiveVacancies(_activeVacancies);
        setOpenTasks(_openTasks);
        setPendingSubs(_pendingSubs);
        setPendingApps(_pendingApps);
        setVacancyApps(
          appsByVacancy
            .map(({ vac, items }) => ({
              vac,
              count: items.length,
              pending: items.filter((a) => a.status === 1).length,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        );
        setActivity(sortedActivity);
      } catch (e: any) {
        console.error("HRDashboard load failed", e);
        setError("Не удалось загрузить данные дашборда. Попробуйте обновить страницу.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Mock: 14-дневный sparkline по откликам/сабмишенам. До v1.0 заменим
  // на /hr/stats/timeline?days=14. См. ROADMAP.
  const sparkline = useMemo(() => mockSparkline(activity.length), [activity.length]);

  // Mock: топ навыков среди откликнувшихся. До v1.0 заменим на агрегацию
  // по skill_slugs в Search-сервисе.
  const topSkills = useMemo(() => MOCK_TOP_SKILLS, []);

  // Mock: воронка conversion
  const funnel = useMemo(
    () => [
      { lbl: "Просмотры вакансий", val: 1240, demo: true },
      { lbl: "Отклики", val: Math.max(activity.filter((a) => a.kind === "application").length, 14) },
      { lbl: "На интервью", val: 6, demo: true },
      { lbl: "Офферы", val: 2, demo: true },
    ],
    [activity]
  );

  return (
    <div className="page-frame">
      <Header />

      <main className="hrd">
        <div className="sj-container">
          {/* HEAD */}
          <div className="hrd__head">
            <div>
              <span className="eyebrow">— рабочий стол hr</span>
              <h1 className="hrd__title">
                Сегодня. <em>Кратко.</em>
              </h1>
              <p className="hrd__lead">
                Сводка по активным вакансиям, микрозадачам и откликам — что
                требует ревью, кто пришёл за неделю.
              </p>
            </div>
            <div className="hrd__head-actions">
              <Link to="/hr/tasks" className="sj-btn sj-btn--primary">+ Микрозадача</Link>
              <Link to="/hr-profile" className="sj-btn sj-btn--ghost">+ Вакансия</Link>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {/* METRICS */}
          <section className="hrd__metrics">
            <StatTile
              label="Активные вакансии"
              value={activeVacancies}
              accent={false}
              link={{ to: "/hr-profile", text: "Управлять" }}
              loading={loading}
            />
            <StatTile
              label="Микрозадачи в работе"
              value={openTasks}
              accent={false}
              link={{ to: "/hr/tasks", text: "К доске" }}
              loading={loading}
            />
            <StatTile
              label="Решений ждут ревью"
              value={pendingSubs}
              accent={pendingSubs > 0}
              link={{ to: "/hr/tasks", text: "Ревьюить" }}
              loading={loading}
            />
            <StatTile
              label="Отклики ждут ответа"
              value={pendingApps}
              accent={pendingApps > 0}
              link={{ to: "/hr-profile", text: "К вакансиям" }}
              loading={loading}
            />
          </section>

          {/* GRID: sparkline + funnel | top skills */}
          <section className="hrd__grid">
            {/* Sparkline */}
            <div className="hrd__card hrd__card--wide">
              <div className="hrd__card-head">
                <span className="eyebrow">— ДИНАМИКА</span>
                <h2 className="hrd__card-title">События за 14 дней</h2>
                <span className="mono subtle">отклики · сабмишены · approvals</span>
              </div>
              <Sparkline data={sparkline} />
              <div className="hrd__legend">
                <span className="hrd__legend-dot" style={{ background: "var(--brand)" }} /> отклики
                <span className="hrd__legend-dot" style={{ background: "var(--verified)" }} /> сабмишены
                <span className="mono subtle" style={{ marginLeft: "auto" }}>demo · timeline</span>
              </div>
            </div>

            {/* Top skills */}
            <div className="hrd__card">
              <div className="hrd__card-head">
                <span className="eyebrow">— ТОП НАВЫКОВ</span>
                <h2 className="hrd__card-title">У ваших кандидатов</h2>
              </div>
              <ul className="hrd__skills">
                {topSkills.map((s, i) => (
                  <li key={s.slug} className="hrd__skill-row">
                    <span className="hrd__skill-rank">{String(i + 1).padStart(2, "0")}</span>
                    <span className="sj-skill">{s.slug}</span>
                    <span className="hrd__skill-bar">
                      <span className="hrd__skill-bar-fill" style={{ width: `${s.value}%` }} />
                    </span>
                    <span className="mono subtle">{s.value}%</span>
                  </li>
                ))}
              </ul>
              <div className="mono subtle" style={{ marginTop: 12 }}>demo · агрегация в Search</div>
            </div>
          </section>

          {/* FUNNEL */}
          <section className="hrd__card hrd__funnel-card">
            <div className="hrd__card-head">
              <span className="eyebrow">— ВОРОНКА</span>
              <h2 className="hrd__card-title">Просмотр → оффер</h2>
            </div>
            <div className="hrd__funnel">
              {funnel.map((f, i) => {
                const width = i === 0 ? 100 : Math.max(8, Math.round((f.val / funnel[0].val) * 100));
                return (
                  <div key={f.lbl} className="hrd__funnel-row">
                    <div className="hrd__funnel-bar" style={{ width: `${width}%` }}>
                      <span className="hrd__funnel-val">{f.val.toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="hrd__funnel-lbl">
                      {f.lbl} {f.demo && <span className="mono subtle">· demo</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Two cols: my top vacancies | activity */}
          <section className="hrd__grid">
            <div className="hrd__card">
              <div className="hrd__card-head">
                <span className="eyebrow">— АКТИВНЫЕ ВАКАНСИИ</span>
                <h2 className="hrd__card-title">Топ по откликам</h2>
              </div>
              {vacancyApps.length === 0 ? (
                <div className="empty-state" style={{ borderStyle: "solid", padding: "var(--space-6)" }}>
                  <div className="empty-state-icon">∅</div>
                  <div className="empty-state-title">Нет активных вакансий</div>
                  <div className="empty-state-text">Создайте первую вакансию, чтобы начать собирать отклики.</div>
                  <Link to="/hr-profile" className="sj-btn sj-btn--primary sj-btn--sm empty-state-cta">+ Вакансия</Link>
                </div>
              ) : (
                <ul className="hrd__vacs">
                  {vacancyApps.map(({ vac, count, pending }) => (
                    <li key={vac.id} className="hrd__vac">
                      <div className="hrd__vac-main">
                        <div className="hrd__vac-title">{vac.title || "—"}</div>
                        <div className="hrd__vac-meta">
                          <span className="mono">{vac.position_status || "—"}</span>
                          {typeof vac.salary === "number" && vac.salary > 0 && (
                            <>· <span className="mono">{vac.salary.toLocaleString("ru-RU")} ₽</span></>
                          )}
                        </div>
                      </div>
                      <div className="hrd__vac-stats">
                        <span className="status-pill">
                          {count} {count === 1 ? "отклик" : "откликов"}
                        </span>
                        {pending > 0 && (
                          <span className="status-pill status-pill--1">
                            {pending} ждут
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/hr/applications?vacancy_id=${encodeURIComponent(vac.id)}`}
                        className="sj-btn sj-btn--ghost sj-btn--sm"
                      >
                        Открыть
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hrd__card">
              <div className="hrd__card-head">
                <span className="eyebrow">— АКТИВНОСТЬ</span>
                <h2 className="hrd__card-title">Последние события</h2>
              </div>
              {loading ? (
                <div className="hrd__activity-skel">
                  <div className="skeleton" style={{ width: "70%", height: 14 }} />
                  <div className="skeleton" style={{ width: "50%", height: 12 }} />
                  <div className="skeleton" style={{ width: "60%", height: 14 }} />
                </div>
              ) : activity.length === 0 ? (
                <div className="empty-state" style={{ borderStyle: "solid", padding: "var(--space-6)" }}>
                  <div className="empty-state-icon">·</div>
                  <div className="empty-state-title">Тишина</div>
                  <div className="empty-state-text">События появятся, как только студенты начнут откликаться и сдавать решения.</div>
                </div>
              ) : (
                <ul className="hrd__activity">
                  {activity.map((a) => (
                    <li key={a.id} className="hrd__activity-item">
                      <span
                        className={
                          "hrd__activity-kind " +
                          (a.kind === "application" ? "hrd__activity-kind--app" : "hrd__activity-kind--sub")
                        }
                      >
                        {a.kind === "application" ? "APP" : "SUB"}
                      </span>
                      <div className="hrd__activity-body">
                        <div className="hrd__activity-title">{a.title}</div>
                        <div className="hrd__activity-meta">
                          <span>{a.subtitle}</span>
                          <span className="hrd__activity-time">· {a.time}</span>
                        </div>
                      </div>
                      <span className={`status-pill status-pill--${a.statusVariant === "approved" ? 2 : a.statusVariant === "rejected" ? 3 : 1}`}>
                        {a.statusLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  accent,
  link,
  loading,
}: {
  label: string;
  value: number;
  accent?: boolean;
  link: { to: string; text: string };
  loading: boolean;
}) {
  return (
    <div className={"sj-stat" + (accent ? " sj-stat--accent" : "")}>
      <div className="sj-stat__label">{label}</div>
      {loading ? (
        <div className="skeleton" style={{ width: 72, height: 42 }} />
      ) : (
        <div className="sj-stat__value">{value}</div>
      )}
      <Link to={link.to} className="sj-link" style={{ fontSize: "var(--text-sm)", marginTop: 6 }}>
        {link.text} →
      </Link>
    </div>
  );
}

/* ── Sparkline (mock) ──────────────────────────────────────────────────── */

function mockSparkline(activityCount: number): { apps: number[]; subs: number[] } {
  const days = 14;
  // Базовая псевдо-случайная волна; в зависимости от наличия activity усиливаем
  const seed = 42 + activityCount;
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const apps: number[] = [];
  const subs: number[] = [];
  for (let i = 0; i < days; i++) {
    apps.push(Math.floor(rnd() * 8 + (i > days - 5 ? 5 : 0)));
    subs.push(Math.floor(rnd() * 5 + (i > days - 3 ? 3 : 0)));
  }
  return { apps, subs };
}

function Sparkline({ data }: { data: { apps: number[]; subs: number[] } }) {
  const w = 720;
  const h = 160;
  const pad = { l: 24, r: 18, t: 18, b: 28 };
  const allMax = Math.max(...data.apps, ...data.subs, 1);
  const days = data.apps.length;
  const stepX = (w - pad.l - pad.r) / (days - 1);

  const toPath = (arr: number[]) =>
    arr
      .map((v, i) => {
        const x = pad.l + i * stepX;
        const y = h - pad.b - (v / allMax) * (h - pad.t - pad.b);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const fillPath = (arr: number[], color: string) => {
    const top = toPath(arr);
    const last = arr.length - 1;
    return (
      <path
        d={`${top} L${(pad.l + last * stepX).toFixed(1)},${h - pad.b} L${pad.l.toFixed(1)},${h - pad.b} Z`}
        fill={color}
        opacity={0.12}
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="hrd__spark" preserveAspectRatio="none">
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((t) => {
        const y = pad.t + t * (h - pad.t - pad.b);
        return (
          <line
            key={t}
            x1={pad.l}
            x2={w - pad.r}
            y1={y}
            y2={y}
            stroke="var(--border-soft)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        );
      })}

      {fillPath(data.apps, "var(--brand)")}
      {fillPath(data.subs, "var(--verified)")}

      <path
        d={toPath(data.apps)}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={toPath(data.subs)}
        fill="none"
        stroke="var(--verified)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="0"
      />

      {/* x-axis day labels (только -14, -7, today) */}
      {[0, Math.floor(days / 2), days - 1].map((i) => (
        <text
          key={i}
          x={pad.l + i * stepX}
          y={h - 8}
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
          fill="var(--ink-subtle)"
          textAnchor="middle"
        >
          {i === days - 1 ? "сегодня" : `-${days - 1 - i}д`}
        </text>
      ))}

      {/* points last */}
      <circle cx={pad.l + (days - 1) * stepX} cy={h - pad.b - (data.apps[days - 1] / allMax) * (h - pad.t - pad.b)} r="4" fill="var(--brand)" />
      <circle cx={pad.l + (days - 1) * stepX} cy={h - pad.b - (data.subs[days - 1] / allMax) * (h - pad.t - pad.b)} r="4" fill="var(--verified)" />
    </svg>
  );
}

/* ── Top skills (mock) ─────────────────────────────────────────────────── */

const MOCK_TOP_SKILLS = [
  { slug: "go", value: 92 },
  { slug: "postgres", value: 78 },
  { slug: "docker", value: 71 },
  { slug: "react", value: 64 },
  { slug: "kubernetes", value: 52 },
  { slug: "typescript", value: 48 },
];
