import React, { useEffect, useMemo, useRef, useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";
import "../assets/styles/vacancies-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SkillsInput from "../components/ui/SkillsInput";
import SkillBadges from "../components/ui/SkillBadges";

import wave from "../assets/images/wave-white.png";
import spiral from "../assets/images/spiral.png";
import checkLong from "../assets/images/check-long.png";

import {
  TasksAPI,
  MicroTask,
  TASK_STATUS,
  taskStatusLabel,
  Submission,
  SUBMISSION_STATUS,
  submissionStatusLabel,
} from "../api/tasks";
import { useToast } from "../components/ui/Toast";
import { getCurrentUserId } from "../api/apiGateway";
import { UsersAPI } from "../api/users";

const DEFAULT_LIMIT = 9;
const PAGE_SIZE_OPTIONS = [9, 15, 25, 50];

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

const cardVariant = (i: number) => {
  const v = i % 3;
  if (v === 0) return "hr-card--green";
  if (v === 1) return "hr-card--red";
  return "hr-card--purple";
};

const cardDecor = (i: number) => {
  const v = i % 3;
  if (v === 0) return wave;
  if (v === 1) return checkLong;
  return spiral;
};

const money = (n?: number) =>
  typeof n === "number" && n > 0
    ? `${new Intl.NumberFormat("ru-RU").format(n)} ₽`
    : "—";

const getMyId = (): string => getCurrentUserId();

const isStudentRole = (role?: string) => {
  const r = String(role || "").toUpperCase();
  // Принимаем как чистый "STUDENT", так и "ROLE_STUDENT" и legacy ROLE_DEVELOPER.
  return r === "STUDENT" || r === "ROLE_STUDENT" || r === "ROLE_DEVELOPER" || r.includes("STUDENT");
};

const getMyRole = (): string => {
  try {
    return localStorage.getItem("role") || "";
  } catch {
    return "";
  }
};

export default function Tasks() {
  const [pageSize, setPageSize] = useState<number>(DEFAULT_LIMIT);
  const [pageJump, setPageJump] = useState<string>("");
  const [showClosed, setShowClosed] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    skill_slugs: [] as string[],
    q: "",
    reward_min: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [pagination, setPagination] = useState<{ total?: number; pages?: number; current_page?: number }>({});

  const [selected, setSelected] = useState<MicroTask | null>(null);
  const [solutionUrl, setSolutionUrl] = useState("");
  const [solutionComment, setSolutionComment] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [actionMsg, setActionMsg] = useState("");
  // Последняя submission'а текущего студента по выбранной задаче — если есть
  // PENDING/APPROVED, форма «отправить решение» прячется и показывается плашка
  // «Отправлено». REJECTED разрешает отправить ещё раз.
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);

  const [myId, setMyId] = useState<string>(() => getMyId());
  useEffect(() => {
    // JWT-decoded id может быть пустым (например, после ручного редактирования токена).
    // Дёргаем /users/me как авторитативный источник и обновляем локальный id.
    if (!isStudentRole(getMyRole())) return;
    (async () => {
      try {
        const me = await UsersAPI.me();
        if (me?.id) setMyId(me.id);
      } catch {
        // ignore
      }
    })();
  }, []);
  const myRole = useMemo(() => getMyRole(), []);
  const canApply = isStudentRole(myRole);

  const currentPage = pagination.current_page ?? filters.page ?? 1;
  const pages = pagination.pages;

  const fetchTasks = async (next?: Partial<typeof filters> & { showClosedOverride?: boolean }) => {
    const merged = { ...filters, ...(next || {}) };
    setFilters({ page: merged.page, limit: merged.limit, skill_slugs: merged.skill_slugs, q: merged.q, reward_min: merged.reward_min });
    setLoading(true);
    setError("");
    try {
      const params: any = {
        page: merged.page,
        limit: merged.limit,
      };
      if (merged.q) params.q = merged.q;
      if (merged.skill_slugs?.length) params.skill_slugs = merged.skill_slugs.join(",");
      if (merged.reward_min) params.reward_min = Number(merged.reward_min) || 0;
      // По умолчанию скрываем завершённые и взятые в работу — студент берёт
      // только статус OPEN. Чекбокс открывает все.
      const wantClosed = next?.showClosedOverride ?? showClosed;
      if (!wantClosed) params.status = TASK_STATUS.OPEN;
      const resp = await TasksAPI.list(params);
      setTasks(resp.tasks || []);
      setPagination(resp.pagination || {});
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить задачи");
      setTasks([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Если в URL пришёл ?task_id=... (например, из «Мои отклики»), открываем модалку
  // конкретной задачи. Подгружаем её отдельным Get, чтобы не зависеть от текущей выдачи.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task_id");
    if (!taskId) return;
    (async () => {
      try {
        const t = await TasksAPI.get(taskId);
        if (t && t.id) setSelected(t);
      } catch {
        // ignore — задачу могли удалить
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstAutoRef = useRef(true);
  useEffect(() => {
    if (firstAutoRef.current) {
      firstAutoRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      fetchTasks({ page: 1 });
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.reward_min, filters.skill_slugs.join(",")]);

  const reset = () => {
    const base = { page: 1, limit: pageSize, skill_slugs: [] as string[], q: "", reward_min: "" };
    setFilters(base);
    fetchTasks(base);
  };

  const closeModal = () => {
    setSelected(null);
    setSolutionUrl("");
    setSolutionComment("");
    setActionMsg("");
  };

  const handleApply = async () => {
    if (!selected) return;
    setBusy(true);
    setActionMsg("");
    try {
      const updated = await TasksAPI.apply(selected.id);
      setActionMsg("Задача взята в работу. Загружайте решение по готовности.");
      setSelected(updated);
      setTasks((arr) => arr.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(
        "Задача в работе",
        `«${updated.title}» — теперь у вас есть deadline и поле для решения.`
      );
    } catch (e: any) {
      setActionMsg(e?.message || "Не удалось взять задачу");
      toast.danger("Не удалось взять", e?.message || "Возможно, кто-то уже взял её первым.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected || !solutionUrl.trim()) return;
    setBusy(true);
    setActionMsg("");
    try {
      const sub = await TasksAPI.submit(selected.id, {
        solution_url: solutionUrl.trim(),
        comment: solutionComment.trim() || undefined,
      });
      setMySubmission(sub);
      setSolutionUrl("");
      setSolutionComment("");
      toast.success(
        "Решение отправлено",
        "HR увидит его в очереди /hr/tasks. После approve ачивка автоматически появится в портфолио."
      );
    } catch (e: any) {
      setActionMsg(e?.message || "Не удалось отправить решение");
      toast.danger("Не удалось отправить решение", e?.message || "Проверьте URL и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  };

  // Подтягиваем последнюю submission'у для выбранной задачи. Без неё после
  // отправки UI не «знает», что решение уже улетело, и форма позволяет дубль.
  useEffect(() => {
    if (!selected || !canApply) {
      setMySubmission(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await TasksAPI.listMySubmissions();
        const list = res?.submissions || [];
        // Сортируем по submitted_at DESC и берём первую запись по этой задаче.
        const forTask = list
          .filter((s) => s.microtask_id === selected.id)
          .sort((a, b) =>
            String(b.submitted_at || "").localeCompare(String(a.submitted_at || ""))
          );
        if (!cancelled) setMySubmission(forTask[0] || null);
      } catch {
        if (!cancelled) setMySubmission(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id, canApply]);

  return (
    <div className="page-frame mj-no-top-divider">
      <Header />

      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Микрозадачи</h1>
        <p className="mj-vac-subtitle">
          Реальные задачи от компаний. Выполните — получите запись в портфолио.
        </p>

        <div className="mj-vac-filters">
          <div className="mj-vac-filters-row">
            <div>
              <label className="mj-vac-label">Поиск</label>
              <input
                className="mj-vac-input"
                placeholder="Например: миграция БД"
                value={filters.q}
                onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
              />
            </div>
            <div>
              <label className="mj-vac-label">Минимальная награда</label>
              <input
                className="mj-vac-input"
                inputMode="numeric"
                placeholder="0"
                value={filters.reward_min}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, reward_min: e.target.value.replace(/[^\d]/g, "") }))
                }
              />
            </div>
            <div className="mj-vac-mini-actions">
              <button
                className="mj-vac-btn"
                disabled={loading}
                onClick={() => fetchTasks({ page: 1 })}
              >
                {loading ? "Загрузка…" : "Применить"}
              </button>
              <button
                className="mj-vac-btn mj-vac-btn--ghost"
                disabled={loading}
                onClick={reset}
              >
                Сброс
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="mj-vac-label">Навыки</label>
            <SkillsInput
              value={filters.skill_slugs}
              onChange={(slugs) => setFilters((s) => ({ ...s, skill_slugs: slugs }))}
              placeholder="Например: go, postgresql, docker"
            />
          </div>

          <label className="mj-vac-show-closed" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => {
                const v = e.target.checked;
                setShowClosed(v);
                fetchTasks({ page: 1, showClosedOverride: v });
              }}
              style={{ accentColor: "var(--brand)" }}
            />
            Показывать завершённые и взятые
          </label>
        </div>

        <div className="mj-vac-meta">
          <div className="mj-vac-meta-left">
            <span className="mj-vac-found">
              {typeof pagination.total === "number"
                ? `Найдено: ${pagination.total}`
                : `Найдено: ${tasks.length}`}
            </span>
            <span className="mj-vac-meta-sep">·</span>
            <span className="mj-vac-page-info">
              Страница <strong>{currentPage}</strong>
              {typeof pages === "number" ? <> из <strong>{pages}</strong></> : null}
            </span>
            <span className="mj-vac-meta-sep">·</span>
            <label className="mj-vac-pagesize">
              <span>Показывать по</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const next = Number(e.target.value) || DEFAULT_LIMIT;
                  setPageSize(next);
                  fetchTasks({ page: 1, limit: next });
                }}
                disabled={loading}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mj-vac-pagination">
            <button type="button" onClick={() => fetchTasks({ page: 1 })} disabled={loading || currentPage <= 1} title="Первая страница" aria-label="Первая страница">«</button>
            <button type="button" onClick={() => fetchTasks({ page: Math.max(1, currentPage - 1) })} disabled={loading || currentPage <= 1} title="Предыдущая страница" aria-label="Предыдущая страница">‹</button>

            {typeof pages === "number"
              ? buildPageList(currentPage, pages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="mj-vac-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => fetchTasks({ page: p })}
                      disabled={loading || p === currentPage}
                      className={p === currentPage ? "is-current" : ""}
                      aria-current={p === currentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                )
              : null}

            <button type="button" onClick={() => fetchTasks({ page: currentPage + 1 })} disabled={loading || (typeof pages === "number" ? currentPage >= pages : false)} title="Следующая страница" aria-label="Следующая страница">›</button>
            <button type="button" onClick={() => fetchTasks({ page: pages as number })} disabled={loading || typeof pages !== "number" || currentPage >= (pages as number)} title="Последняя страница" aria-label="Последняя страница">»</button>

            {typeof pages === "number" && pages > 7 ? (
              <form
                className="mj-vac-page-jump"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Math.min(Math.max(1, Number(pageJump) || 1), pages as number);
                  setPageJump("");
                  fetchTasks({ page: n });
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={pages}
                  placeholder="№"
                  value={pageJump}
                  onChange={(e) => setPageJump(e.target.value)}
                  aria-label="Перейти к странице"
                />
                <button type="submit" disabled={loading || !pageJump}>↵</button>
              </form>
            ) : null}
          </div>
        </div>

        {error ? (
          <div style={{ color: "#c02838", fontWeight: 800, marginBottom: 14 }}>
            {error}
          </div>
        ) : null}

        <div className="mj-vac-grid">
          {tasks.map((t, idx) => (
            <article
              key={t.id}
              className={`hr-card mj-vac-card ${cardVariant(idx)}`}
              onClick={() => setSelected(t)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelected(t);
              }}
            >
              <div className="hr-card-decor" aria-hidden>
                <img src={cardDecor(idx)} alt="" />
              </div>
              <h3>{t.title}</h3>

              {Array.isArray(t.skill_slugs) && t.skill_slugs.length ? (
                <div style={{ marginTop: 6 }}>
                  <SkillBadges slugs={t.skill_slugs.slice(0, 5)} />
                </div>
              ) : null}

              <div className="hr-card-link">Подробнее</div>

              <div className="mj-vac-kpi">
                <span className="mj-vac-pill">Награда: {money(t.reward)}</span>
                <span className="mj-vac-pill">{taskStatusLabel(t.status)}</span>
              </div>

              {t.deadline ? (
                <div style={{ marginTop: 8, opacity: 0.85, fontWeight: 700, fontSize: 13 }}>
                  До {t.deadline}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {!loading && !error && tasks.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 14 }}>
            Нет открытых задач под эти фильтры.
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mj-modal-backdrop" onClick={closeModal}>
          <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mj-modal-header">
              <div>
                <h2 className="mj-modal-title" style={{ marginBottom: 6 }}>
                  {selected.title}
                </h2>
                <p className="mj-modal-subtitle">
                  Награда: {money(selected.reward)} • Статус: {taskStatusLabel(selected.status)}
                  {selected.deadline ? ` • До ${selected.deadline}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Закрыть
              </button>
            </div>

            {Array.isArray(selected.skill_slugs) && selected.skill_slugs.length ? (
              <div className="mj-field" style={{ marginBottom: 12 }}>
                <div className="mj-label">Требуемые навыки</div>
                <SkillBadges slugs={selected.skill_slugs} />
              </div>
            ) : null}

            <div className="mj-field" style={{ marginBottom: 12 }}>
              <div className="mj-label">Описание</div>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {selected.description || "—"}
              </div>
            </div>

            {actionMsg ? (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(0,0,0,0.04)",
                  borderRadius: 12,
                  marginBottom: 12,
                  fontWeight: 700,
                }}
              >
                {actionMsg}
              </div>
            ) : null}

            {canApply && selected.status === TASK_STATUS.OPEN ? (
              <button
                type="button"
                className="mj-vac-btn"
                style={{ width: "100%", borderRadius: 14, padding: "12px 16px", fontWeight: 900 }}
                disabled={busy}
                onClick={handleApply}
              >
                {busy ? "Берём…" : "Взять задачу"}
              </button>
            ) : null}

            {canApply &&
            selected.status === TASK_STATUS.ASSIGNED &&
            myId &&
            selected.assigned_to === myId ? (
              // Если есть PENDING/APPROVED submission — форма не нужна, вместо неё
              // плашка-итог. REJECTED разрешает отправить заново (HR не принял).
              mySubmission && mySubmission.status !== SUBMISSION_STATUS.REJECTED ? (
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: "var(--success-soft, rgba(93,179,116,0.14))",
                    border: "1px solid var(--success, #5db374)",
                    color: "var(--ink, inherit)",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>
                    ✓ Решение отправлено · {submissionStatusLabel(mySubmission.status)}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85, wordBreak: "break-all" }}>
                    Ссылка: {mySubmission.solution_url}
                  </div>
                  {mySubmission.comment ? (
                    <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                      Комментарий: {mySubmission.comment}
                    </div>
                  ) : null}
                  {mySubmission.status === SUBMISSION_STATUS.APPROVED && mySubmission.review_comment ? (
                    <div style={{ fontSize: 13, marginTop: 6 }}>
                      <strong>Ревьюер:</strong> {mySubmission.review_comment}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                    HR увидит решение в /hr/tasks. После approve ачивка появится в портфолио.
                  </div>
                </div>
              ) : (
                <div className="mj-grid">
                  {mySubmission && mySubmission.status === SUBMISSION_STATUS.REJECTED ? (
                    <div
                      className="mj-field"
                      style={{
                        gridColumn: "1 / -1",
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: "var(--danger-soft, rgba(215,98,98,0.14))",
                        border: "1px solid var(--danger, #d76262)",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>Прошлое решение отклонено</div>
                      {mySubmission.review_comment ? (
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          <strong>Ревьюер:</strong> {mySubmission.review_comment}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        Можно загрузить новую версию ниже.
                      </div>
                    </div>
                  ) : null}
                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <div className="mj-label">Ссылка на решение (репо/архив)</div>
                    <input
                      className="mj-vac-input"
                      placeholder="https://github.com/..."
                      value={solutionUrl}
                      onChange={(e) => setSolutionUrl(e.target.value)}
                    />
                  </div>
                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <div className="mj-label">Комментарий (необязательно)</div>
                    <textarea
                      className="mj-vac-input"
                      rows={3}
                      placeholder="Что важно знать ревьюеру"
                      value={solutionComment}
                      onChange={(e) => setSolutionComment(e.target.value)}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <button
                      type="button"
                      className="mj-vac-btn"
                      style={{ width: "100%", borderRadius: 14, padding: "12px 16px", fontWeight: 900 }}
                      disabled={busy || !solutionUrl.trim()}
                      onClick={handleSubmit}
                    >
                      {busy ? "Отправка…" : "Отправить решение"}
                    </button>
                  </div>
                </div>
              )
            ) : null}

            {selected.status === TASK_STATUS.ASSIGNED && (!myId || selected.assigned_to !== myId) ? (
              <div style={{ opacity: 0.7, fontWeight: 700 }}>
                Задача уже взята другим студентом.
              </div>
            ) : null}

            {selected.status === TASK_STATUS.COMPLETED ? (
              <div style={{ opacity: 0.7, fontWeight: 700 }}>
                Задача завершена.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
