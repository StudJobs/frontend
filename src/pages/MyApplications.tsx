import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import {
  ApplicationsAPI,
  Application,
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
} from "../api/applications";
import {
  TasksAPI,
  MicroTask,
  TASK_STATUS,
  taskStatusLabel,
  Submission,
  SUBMISSION_STATUS,
  submissionStatusLabel,
} from "../api/tasks";
import { apiGateway } from "../api/apiGateway";
import { useToast } from "../components/ui/Toast";
import SkillBadges from "../components/ui/SkillBadges";

type Tab = "vacancies" | "tasks" | "quests";

const money = (n?: number) =>
  typeof n === "number" && n > 0 ? `${new Intl.NumberFormat("ru-RU").format(n)} ₽` : "—";

// Маппинг ApplicationStatus → таб «Все/Pending/Accepted/Rejected».
const APP_STATUS_OPTIONS: { value: ApplicationStatus | 0; label: string }[] = [
  { value: 0, label: "Все" },
  { value: 1, label: APPLICATION_STATUS_LABELS[1] },
  { value: 2, label: APPLICATION_STATUS_LABELS[2] },
  { value: 3, label: APPLICATION_STATUS_LABELS[3] },
];

const TASK_STATUS_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Все" },
  { value: TASK_STATUS.ASSIGNED, label: "В работе" },
  { value: TASK_STATUS.COMPLETED, label: "Завершённые" },
  { value: TASK_STATUS.CANCELLED, label: "Закрытые" },
];

export default function MyApplications() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("vacancies");
  const [q, setQ] = useState("");
  const qDebounced = useDebounced(q, 350);

  return (
    <>
      <Header />
      <main className="page-narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className="page-title">Мои отклики и задачи</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setTab("vacancies")}
            className={tab === "vacancies" ? "chip chip--active" : "chip"}
          >
            Вакансии
          </button>
          <button
            type="button"
            onClick={() => setTab("tasks")}
            className={tab === "tasks" ? "chip chip--active" : "chip"}
          >
            Микрозадачи
          </button>
          <button
            type="button"
            onClick={() => setTab("quests")}
            className={tab === "quests" ? "chip chip--active" : "chip"}
          >
            Квесты от экспертов
          </button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <input
            className="mj-vac-input"
            placeholder={
              tab === "vacancies"
                ? "Поиск по вакансии или сопроводительному…"
                : "Поиск по задаче, описанию или решению…"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        {tab === "vacancies" && <VacanciesTab q={qDebounced} toast={toast} />}
        {tab === "tasks" && <TasksTab q={qDebounced} toast={toast} kind="regular" />}
        {tab === "quests" && <TasksTab q={qDebounced} toast={toast} kind="quest" />}
      </main>
      <Footer />
    </>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ───────── Вкладка «Вакансии»: то, что было в старом MyApplications. ─────────

type VacancyMini = { id: string; title: string };

const PAGE_SIZES = [9, 15, 25, 50];

function VacanciesTab({ q, toast }: { q: string; toast: ReturnType<typeof useToast> }) {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 0>(0);
  const [vacancyTitles, setVacancyTitles] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState<number>(9);
  const [page, setPage] = useState<number>(1);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = statusFilter === 0 ? {} : { status: statusFilter };
      const res = await ApplicationsAPI.listMine(params);
      setItems(res.applications);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить отклики");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const missing = items.map((a) => a.vacancy_id).filter((id) => id && !vacancyTitles[id]);
    if (missing.length === 0) return;
    const uniq = Array.from(new Set(missing));
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        uniq.map(async (vid) => {
          try {
            const resp: any = await apiGateway({ method: "GET", url: `/vacancy/${vid}` });
            const v: VacancyMini = resp?.data ?? resp;
            if (v?.title) updates[vid] = v.title;
          } catch {
            // ignore
          }
        })
      );
      if (Object.keys(updates).length) {
        setVacancyTitles((prev) => ({ ...prev, ...updates }));
      }
    })();
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleWithdraw(id: string) {
    if (!window.confirm("Отозвать отклик?")) return;
    try {
      await ApplicationsAPI.withdraw(id);
      toast.success("Отклик отозван");
      void load();
    } catch (e: any) {
      toast.danger(e?.message ?? "Не удалось отозвать отклик");
    }
  }

  // Клиентский фильтр по строке поиска: ищем по названию вакансии и сопроводительному.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((a) => {
      const title = (vacancyTitles[a.vacancy_id] || "").toLowerCase();
      const cl = (a.cover_letter || "").toLowerCase();
      return title.includes(needle) || cl.includes(needle);
    });
  }, [items, q, vacancyTitles]);

  // Пагинация поверх отфильтрованного.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );
  useEffect(() => {
    setPage(1); // сброс на 1 при смене поиска или статуса
  }, [q, statusFilter, pageSize]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {APP_STATUS_OPTIONS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setStatusFilter(t.value)}
            className={statusFilter === t.value ? "chip chip--active" : "chip"}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="muted">Загрузка…</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>{items.length === 0 ? "Пока нет откликов." : "По запросу ничего не найдено."}</p>
          {items.length === 0 && (
            <Link className="link" to="/vacancies">
              Посмотреть вакансии →
            </Link>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Pagination
          total={filtered.length}
          page={safePage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pageItems.map((a) => {
          const title = vacancyTitles[a.vacancy_id] ?? "Вакансия";
          return (
            <article key={a.id} className="application-card">
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <Link
                    to={`/vacancies?vacancy_id=${encodeURIComponent(a.vacancy_id)}`}
                    className="application-card__title"
                  >
                    {title}
                  </Link>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Отклик от {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                <span className={`status-pill status-pill--${a.status}`}>
                  {APPLICATION_STATUS_LABELS[a.status]}
                </span>
              </header>

              {a.cover_letter && (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Сопроводительное письмо
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{a.cover_letter}</div>
                </div>
              )}

              {a.hr_comment && (a.status === 2 || a.status === 3) && (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Комментарий HR
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{a.hr_comment}</div>
                </div>
              )}

              {a.status === 1 && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => handleWithdraw(a.id)}>
                    Отозвать
                  </button>
                </div>
              )}

              <div style={{ marginTop: 10, borderTop: "1px dashed var(--border)", paddingTop: 8 }}>
                <Link className="link" to={`/messages?thread=application:${encodeURIComponent(a.id)}`}>
                  Открыть чат с HR →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ───────── Вкладка «Микрозадачи»: новая. ─────────
// Источник правды — два запроса: TasksAPI.listMyAssigned() (мои задачи) и
// TasksAPI.listMySubmissions() (мои решения). Сабмишены группируем по
// microtask_id и привязываем к карточкам — у задачи может быть несколько
// (rejected → новая попытка), показываем последнюю.

function TasksTab({ q, toast, kind }: { q: string; toast: ReturnType<typeof useToast>; kind: "regular" | "quest" }) {
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(9);
  const [page, setPage] = useState<number>(1);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [tResp, sResp] = await Promise.all([
        TasksAPI.listMyAssigned(statusFilter ? { status: statusFilter } : {}),
        TasksAPI.listMySubmissions(),
      ]);
      setTasks(tResp.tasks || []);
      setSubs(sResp.submissions || []);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить мои задачи");
      setTasks([]);
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Маппинг microtask_id → последняя submission.
  const latestSubByTask = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const s of subs) {
      const prev = map.get(s.microtask_id);
      if (!prev) {
        map.set(s.microtask_id, s);
        continue;
      }
      const ta = new Date(s.submitted_at || 0).getTime();
      const tb = new Date(prev.submitted_at || 0).getTime();
      if (ta >= tb) map.set(s.microtask_id, s);
    }
    return map;
  }, [subs]);

  const filtered = useMemo(() => {
    const byKind = tasks.filter((t) => (kind === "quest" ? !!t.is_skill_quest : !t.is_skill_quest));
    const needle = q.trim().toLowerCase();
    if (!needle) return byKind;
    return byKind.filter((t) => {
      const inTitle = t.title.toLowerCase().includes(needle);
      const inDesc = (t.description || "").toLowerCase().includes(needle);
      const sub = latestSubByTask.get(t.id);
      const inSol = sub
        ? (sub.solution_url || "").toLowerCase().includes(needle) || (sub.comment || "").toLowerCase().includes(needle)
        : false;
      return inTitle || inDesc || inSol;
    });
  }, [tasks, q, latestSubByTask, kind]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );
  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, pageSize, kind]);

  const submissionPillClass = (s?: number) => {
    if (s === SUBMISSION_STATUS.PENDING) return "status-pill status-pill--1";
    if (s === SUBMISSION_STATUS.APPROVED) return "status-pill status-pill--2";
    if (s === SUBMISSION_STATUS.REJECTED) return "status-pill status-pill--3";
    return "status-pill";
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {TASK_STATUS_OPTIONS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setStatusFilter(t.value)}
            className={statusFilter === t.value ? "chip chip--active" : "chip"}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="muted">Загрузка…</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>
            {tasks.length === 0
              ? "Вы пока не брали ни одной микрозадачи."
              : "По запросу ничего не найдено."}
          </p>
          {tasks.length === 0 && (
            <Link className="link" to="/tasks">
              Найти микрозадачу →
            </Link>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Pagination
          total={filtered.length}
          page={safePage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pageItems.map((t) => {
          const sub = latestSubByTask.get(t.id);
          const isExpanded = expandedId === t.id;
          const canSubmit =
            t.status === TASK_STATUS.ASSIGNED && (!sub || sub.status === SUBMISSION_STATUS.REJECTED);
          return (
            <article key={t.id} className="application-card">
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    className="application-card__title"
                    style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}
                  >
                    {t.title}
                  </button>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Награда: {money(t.reward)}
                    {t.deadline ? ` · Дедлайн ${t.deadline}` : ""}
                  </div>
                </div>
                <span
                  className={`status-pill status-pill--${
                    t.status === TASK_STATUS.COMPLETED ? 2 : t.status === TASK_STATUS.CANCELLED ? 3 : 1
                  }`}
                >
                  {taskStatusLabel(t.status)}
                </span>
              </header>

              {Array.isArray(t.skill_slugs) && t.skill_slugs.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <SkillBadges slugs={t.skill_slugs.slice(0, 6)} />
                </div>
              )}

              {(isExpanded || !sub) && t.description && (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Описание
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{t.description}</div>
                </div>
              )}

              {sub && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--surface-soft)", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div className="muted" style={{ fontSize: 12 }}>Моё последнее решение</div>
                    <span className={submissionPillClass(sub.status)}>
                      {submissionStatusLabel(sub.status)}
                    </span>
                  </div>
                  {sub.solution_url && !sub.solution_url.startsWith("file://") && (
                    <div style={{ marginBottom: 4 }}>
                      <a className="link" href={sub.solution_url} target="_blank" rel="noopener noreferrer">
                        {sub.solution_url}
                      </a>
                    </div>
                  )}
                  {sub.solution_file_url && (
                    <div style={{ marginBottom: 4 }}>
                      <a className="link" href={sub.solution_file_url} target="_blank" rel="noopener noreferrer">
                        Файл: {sub.solution_file_name?.split("-").slice(1).join("-") || sub.solution_file_name}
                      </a>
                    </div>
                  )}
                  {sub.comment && (
                    <div style={{ whiteSpace: "pre-wrap", marginBottom: 4 }}>{sub.comment}</div>
                  )}
                  {sub.review_comment &&
                    (sub.status === SUBMISSION_STATUS.APPROVED || sub.status === SUBMISSION_STATUS.REJECTED) && (
                      <div style={{ marginTop: 6 }}>
                        <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
                          Комментарий ревьюера
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{sub.review_comment}</div>
                      </div>
                    )}
                </div>
              )}

              {isExpanded && canSubmit && (
                <SubmitForm
                  task={t}
                  toast={toast}
                  onDone={() => {
                    setExpandedId(null);
                    void load();
                  }}
                />
              )}

              {/* CTA: «Развернуть и загрузить решение» */}
              {!isExpanded && canSubmit && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setExpandedId(t.id)}>
                    {sub?.status === SUBMISSION_STATUS.REJECTED ? "Отправить новое решение" : "Загрузить решение"}
                  </button>
                </div>
              )}

              {isExpanded && (
                <div style={{ marginTop: 10, borderTop: "1px dashed var(--border)", paddingTop: 8 }}>
                  <Link
                    className="link"
                    to={`/messages?thread=${t.is_skill_quest ? "quest" : "task"}:${encodeURIComponent(t.id)}`}
                  >
                    {t.is_skill_quest ? "Открыть чат с экспертом →" : "Открыть чат с заказчиком →"}
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

// Inline-форма submit для микрозадачи. Поля: URL + опц. файл + опц. комментарий.
// Файл при наличии грузится через presigned PUT (B3); пока B3 не подключён,
// поле disabled. URL обязателен.
function SubmitForm({
  task,
  toast,
  onDone,
}: {
  task: MicroTask;
  toast: ReturnType<typeof useToast>;
  onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!url.trim() && !file) {
      toast.danger("Укажите ссылку или прикрепите файл с решением");
      return;
    }
    setBusy(true);
    try {
      let solutionUrl = url.trim();
      let solutionFileName = "";
      if (file) {
        const init = await TasksAPI.solutionUploadInit(task.id, file.name);
        await fetch(init.upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        await TasksAPI.solutionUploadConfirm(task.id, init.file_id);
        solutionFileName = file.name;
        // Если URL не указан — используем имя файла как «человеческий» якорь.
        if (!solutionUrl) solutionUrl = `file://${solutionFileName}`;
      }
      await TasksAPI.submit(task.id, {
        solution_url: solutionUrl,
        comment: comment.trim() || undefined,
        solution_file_name: solutionFileName || undefined,
      });
      toast.success("Решение отправлено", "HR увидит его в очереди ревью.");
      onDone();
    } catch (e: any) {
      toast.danger("Не удалось отправить решение", e?.message || "Проверьте поля и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 14, padding: 14, border: "1px solid var(--border)", borderRadius: 12 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Новое решение
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          className="mj-vac-input"
          placeholder="Ссылка на репозиторий / гист / результат"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <label className="muted" style={{ fontSize: 12 }}>
          Или файл (PDF/архив/изображение):
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: "block", marginTop: 4 }}
          />
        </label>
        <textarea
          className="mj-vac-input"
          rows={3}
          placeholder="Комментарий (необязательно): что важно знать ревьюеру"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={handleSubmit}>
            {busy ? "Отправка…" : "Отправить на ревью"}
          </button>
        </div>
      </div>
    </div>
  );
}


function Pagination({
  total,
  page,
  pageSize,
  totalPages,
  onPage,
  onPageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPage: (n: number) => void;
  onPageSize: (n: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        padding: "8px 0",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "var(--ink-muted)",
      }}
    >
      <span>Найдено: <strong style={{ color: "var(--ink)" }}>{total}</strong></span>
      <span>·</span>
      <span>
        Стр. <strong style={{ color: "var(--ink)" }}>{page}</strong>/{totalPages}
      </span>
      <span>·</span>
      <label>
        По{" "}
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value) || 9)}
          style={{ marginLeft: 4 }}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
        <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => onPage(1)}>
          «
        </button>
        <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹
        </button>
        <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          ›
        </button>
        <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => onPage(totalPages)}>
          »
        </button>
      </span>
    </div>
  );
}
