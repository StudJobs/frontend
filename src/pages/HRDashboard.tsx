import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";
import "../assets/styles/vacancies-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import {
  TasksAPI,
  TASK_STATUS,
  SUBMISSION_STATUS,
  MicroTask,
  Submission,
  taskStatusLabel,
  submissionStatusLabel,
} from "../api/tasks";
import { VacanciesAPI, VacancyItem } from "../api/vacancies";

type Metrics = {
  activeVacancies: number;
  openTasks: number;
  pendingSubmissions: number;
  weekSubmissions: number;
};

type ActivityItem = {
  id: string;
  type: "submission" | "task";
  title: string;
  subtitle: string;
  time: string;
  status: string;
  statusVariant: "pending" | "approved" | "rejected" | "default";
};

const safeHostname = (url?: string): string => {
  if (!url) return "—";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 32 ? `${url.slice(0, 32)}…` : url;
  }
};

const formatRelative = (ts?: string): string => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} дн назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const submissionVariant = (
  s?: number
): "pending" | "approved" | "rejected" | "default" => {
  switch (s) {
    case SUBMISSION_STATUS.PENDING:
      return "pending";
    case SUBMISSION_STATUS.APPROVED:
      return "approved";
    case SUBMISSION_STATUS.REJECTED:
      return "rejected";
    default:
      return "default";
  }
};

export default function HRDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    activeVacancies: 0,
    openTasks: 0,
    pendingSubmissions: 0,
    weekSubmissions: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [vacanciesResp, tasksResp] = await Promise.all([
          VacanciesAPI.listMine().catch(() => [] as VacancyItem[]),
          TasksAPI.listMine().catch(() => ({ tasks: [] })),
        ]);

        const vacancies = vacanciesResp || [];
        const tasks = tasksResp.tasks || [];

        const activeVacancies = vacancies.length;
        const openTasks = tasks.filter(
          (t: MicroTask) =>
            t.status === TASK_STATUS.OPEN || t.status === TASK_STATUS.ASSIGNED
        ).length;

        // Подтягиваем сабмишены ТОЛЬКО для задач в работе/завершённых.
        // OPEN — там нет submissions по определению.
        const tasksWithSubs = tasks.filter(
          (t: MicroTask) =>
            t.status === TASK_STATUS.ASSIGNED ||
            t.status === TASK_STATUS.COMPLETED
        );

        const subsResults = await Promise.all(
          tasksWithSubs.map((t) =>
            TasksAPI.listSubmissions(t.id)
              .then((r) => ({ task: t, subs: r.submissions || [] }))
              .catch(() => ({ task: t, subs: [] as Submission[] }))
          )
        );

        if (cancelled) return;

        let pendingSubmissions = 0;
        let weekSubmissions = 0;
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const allSubs: { task: MicroTask; sub: Submission }[] = [];

        for (const { task, subs } of subsResults) {
          for (const sub of subs) {
            allSubs.push({ task, sub });
            if (sub.status === SUBMISSION_STATUS.PENDING) pendingSubmissions++;
            const submittedAt = sub.submitted_at
              ? new Date(sub.submitted_at).getTime()
              : 0;
            if (submittedAt >= weekAgo) weekSubmissions++;
          }
        }

        // Лента активности: 10 последних сабмишенов по дате.
        const sorted = allSubs
          .filter((x) => x.sub.submitted_at)
          .sort((a, b) => {
            const ta = new Date(a.sub.submitted_at!).getTime();
            const tb = new Date(b.sub.submitted_at!).getTime();
            return tb - ta;
          })
          .slice(0, 10);

        const items: ActivityItem[] = sorted.map(({ task, sub }) => ({
          id: sub.id,
          type: "submission",
          title: task.title,
          subtitle: `Решение от студента · ${safeHostname(sub.solution_url)}`,
          time: formatRelative(sub.submitted_at),
          status: submissionStatusLabel(sub.status),
          statusVariant: submissionVariant(sub.status),
        }));

        setMetrics({
          activeVacancies,
          openTasks,
          pendingSubmissions,
          weekSubmissions,
        });
        setActivity(items);
      } catch (e: any) {
        console.error("HRDashboard load failed", e);
        setError("Не удалось загрузить данные дашборда. Попробуйте обновить страницу.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-frame">
      <Header />
      <section className="profile-section">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.2vw, 40px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
              color: "var(--fg)",
            }}
          >
            HR Dashboard
          </h1>
          <p
            style={{
              color: "var(--fg-muted)",
              fontSize: 15,
              maxWidth: 720,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Сводка по активным вакансиям и микрозадачам — что требует ревью,
            что новые студенты сдали за неделю.
          </p>
        </div>

        {error ? (
          <div
            style={{
              color: "var(--danger)",
              background: "var(--danger-soft)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          className="metric-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          <MetricCard
            label="Активных вакансий"
            value={metrics.activeVacancies}
            hint="Опубликовано от вашего HR-аккаунта"
            link="/hr-profile"
            linkLabel="Управлять"
            loading={loading}
            tone="accent"
          />
          <MetricCard
            label="Открытых микрозадач"
            value={metrics.openTasks}
            hint="OPEN + ASSIGNED по вашим заказам"
            link="/hr/tasks"
            linkLabel="К доске"
            loading={loading}
            tone="info"
          />
          <MetricCard
            label="Решений на ревью"
            value={metrics.pendingSubmissions}
            hint="Жду вашего approve/reject"
            link="/hr/tasks"
            linkLabel={metrics.pendingSubmissions ? "Ревьюить" : "—"}
            loading={loading}
            tone="warning"
            highlight={metrics.pendingSubmissions > 0}
          />
          <MetricCard
            label="Сабмишенов за неделю"
            value={metrics.weekSubmissions}
            hint="Активность студентов"
            link="/hr/tasks"
            linkLabel="Подробнее"
            loading={loading}
            tone="success"
          />
        </div>

        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginBottom: 12,
              color: "var(--fg)",
            }}
          >
            Лента активности
          </h2>
          {loading ? (
            <div
              className="empty-state"
              style={{ borderStyle: "solid", padding: 32 }}
            >
              <div className="skeleton" style={{ width: "60%", height: 14 }} />
              <div className="skeleton" style={{ width: "40%", height: 12 }} />
            </div>
          ) : activity.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                ☐
              </span>
              <div className="empty-state-title">Активности пока нет</div>
              <div className="empty-state-text">
                Когда студенты начнут сдавать решения по вашим микрозадачам, события
                появятся здесь — последние сверху.
              </div>
              <Link to="/hr/tasks" className="profile-btn empty-state-cta">
                Создать первую задачу
              </Link>
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {activity.map((a) => (
                <li
                  key={a.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3) var(--space-4)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "var(--space-3)",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--fg)",
                        marginBottom: 2,
                      }}
                    >
                      {a.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--fg-muted)",
                      }}
                    >
                      {a.subtitle} · {a.time}
                    </div>
                  </div>
                  <span className={`v-badge v-badge--${badgeKind(a.statusVariant)}`}>
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <Link to="/hr/tasks" className="profile-btn">
            + Новая микрозадача
          </Link>
          <Link to="/hr-profile" className="mj-btn mj-btn--ghost" style={{ textDecoration: "none" }}>
            Полный HR-профиль
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function badgeKind(v: ActivityItem["statusVariant"]): string {
  switch (v) {
    case "pending":
      return "pending";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return "draft";
  }
}

type MetricTone = "accent" | "info" | "warning" | "success";

const TONE_COLORS: Record<MetricTone, { fg: string; bg: string; border: string }> = {
  accent:  { fg: "var(--accent)",  bg: "var(--accent-soft)",  border: "rgba(59, 130, 246, 0.3)" },
  info:    { fg: "var(--info)",    bg: "var(--info-soft)",    border: "rgba(6, 182, 212, 0.3)" },
  warning: { fg: "var(--warning)", bg: "var(--warning-soft)", border: "rgba(245, 158, 11, 0.3)" },
  success: { fg: "var(--success)", bg: "var(--success-soft)", border: "rgba(34, 197, 94, 0.3)" },
};

function MetricCard({
  label,
  value,
  hint,
  link,
  linkLabel,
  loading,
  tone,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  link: string;
  linkLabel: string;
  loading: boolean;
  tone: MetricTone;
  highlight?: boolean;
}) {
  const c = TONE_COLORS[tone];
  return (
    <div
      style={{
        background: "var(--surface)",
        border: highlight ? `1px solid ${c.border}` : "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {highlight ? (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: c.fg,
          }}
        />
      ) : null}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
        }}
      >
        {label}
      </div>
      {loading ? (
        <div className="skeleton" style={{ width: 64, height: 36 }} />
      ) : (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 36,
            fontWeight: 700,
            color: c.fg,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      )}
      <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{hint}</div>
      <Link
        to={link}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: c.fg,
          textDecoration: "none",
          marginTop: "auto",
        }}
      >
        {linkLabel} →
      </Link>
    </div>
  );
}
