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
} from "../api/tasks";
import { useToast } from "../components/ui/Toast";

const DEFAULT_LIMIT = 9;

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

const getMyId = (): string => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("me");
    if (!raw) return "";
    const obj = JSON.parse(raw);
    return obj?.id || obj?.user_id || "";
  } catch {
    return "";
  }
};

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

  const myId = useMemo(() => getMyId(), []);
  const myRole = useMemo(() => getMyRole(), []);
  const canApply = isStudentRole(myRole);

  const currentPage = pagination.current_page ?? filters.page ?? 1;
  const pages = pagination.pages;

  const fetchTasks = async (next?: Partial<typeof filters>) => {
    const merged = { ...filters, ...(next || {}) };
    setFilters(merged);
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
    const base = { page: 1, limit: DEFAULT_LIMIT, skill_slugs: [] as string[], q: "", reward_min: "" };
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
      await TasksAPI.submit(selected.id, {
        solution_url: solutionUrl.trim(),
        comment: solutionComment.trim() || undefined,
      });
      setActionMsg("Решение отправлено на ревью. Ждите ответа HR.");
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
        </div>

        <div className="mj-vac-meta">
          <div>Найдено: {tasks.length}</div>

          <div className="mj-vac-pagination">
            <button
              onClick={() => fetchTasks({ page: Math.max(1, currentPage - 1) })}
              disabled={loading || currentPage <= 1}
            >
              Назад
            </button>
            <button
              onClick={() => fetchTasks({ page: currentPage + 1 })}
              disabled={
                loading ||
                (typeof pages === "number" ? currentPage >= pages : false)
              }
            >
              Вперёд
            </button>
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
              <div className="mj-grid">
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
