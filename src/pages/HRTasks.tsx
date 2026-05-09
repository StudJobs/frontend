import React, { useEffect, useState } from "react";
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
  Submission,
  TASK_STATUS,
  taskStatusLabel,
  SUBMISSION_STATUS,
  submissionStatusLabel,
} from "../api/tasks";
import { useToast } from "../components/ui/Toast";

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

export default function HRTasks() {
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  // Создание задачи
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newReward, setNewReward] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newSkillSlugs, setNewSkillSlugs] = useState<string[]>([]);
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState("");

  // Ревью submission'ов
  const [activeTask, setActiveTask] = useState<MicroTask | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewBusy, setReviewBusy] = useState<string>("");
  const [reviewMsg, setReviewMsg] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await TasksAPI.listMine();
      setTasks(resp.tasks || []);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить задачи");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewReward("");
    setNewDeadline("");
    setNewSkillSlugs([]);
    setCreateErr("");
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setCreateErr("Введите название задачи");
      return;
    }
    setCreateBusy(true);
    setCreateErr("");
    try {
      const created = await TasksAPI.create({
        title: newTitle.trim(),
        description: newDescription.trim(),
        reward: Number(newReward) || 0,
        deadline: newDeadline.trim() || undefined,
        skill_slugs: newSkillSlugs.length ? newSkillSlugs : undefined,
      });
      setTasks((arr) => [created, ...arr]);
      resetCreateForm();
      setShowCreate(false);
      toast.success(
        "Задача опубликована",
        `«${created.title}» — теперь в /tasks её увидят студенты с подходящими навыками.`
      );
    } catch (e: any) {
      setCreateErr(e?.message || "Не удалось создать задачу");
      toast.danger("Не удалось создать", e?.message || "Проверьте поля и попробуйте снова.");
    } finally {
      setCreateBusy(false);
    }
  };

  const openReview = async (task: MicroTask) => {
    setActiveTask(task);
    setSubmissions([]);
    setReviewMsg("");
    try {
      const resp = await TasksAPI.listSubmissions(task.id);
      setSubmissions(resp.submissions || []);
    } catch (e: any) {
      setReviewMsg(e?.message || "Не удалось загрузить решения");
    }
  };

  const handleReview = async (subId: string, status: 2 | 3, comment: string) => {
    setReviewBusy(subId);
    setReviewMsg("");
    try {
      const updated = await TasksAPI.review(subId, status, comment);
      setSubmissions((arr) => arr.map((s) => (s.id === subId ? updated : s)));
      // если approve — задача стала COMPLETED, обновляем список
      if (status === SUBMISSION_STATUS.APPROVED && activeTask) {
        await fetchTasks();
        setActiveTask((t) => (t ? { ...t, status: TASK_STATUS.COMPLETED } : t));
        toast.success(
          "Решение принято",
          "У студента автоматически появилась ачивка типа «Микрозадача» со статусом «Подтверждено»."
        );
      } else if (status === SUBMISSION_STATUS.REJECTED) {
        toast.warning("Решение отклонено", "Студент увидит ваш комментарий и сможет переделать.");
      }
    } catch (e: any) {
      setReviewMsg(e?.message || "Не удалось обновить статус");
      toast.danger("Не удалось обновить статус", e?.message || "Попробуйте позже.");
    } finally {
      setReviewBusy("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить задачу?")) return;
    try {
      await TasksAPI.remove(id);
      setTasks((arr) => arr.filter((t) => t.id !== id));
      if (activeTask?.id === id) setActiveTask(null);
    } catch (e: any) {
      setError(e?.message || "Не удалось удалить задачу");
    }
  };

  return (
    <div className="page-frame mj-no-top-divider">
      <Header />

      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Мои микрозадачи</h1>
        <p className="mj-vac-subtitle">
          Опубликуйте задачу — найдите студента, который её решит.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            className="mj-vac-btn"
            onClick={() => setShowCreate((s) => !s)}
            style={{ minWidth: 220 }}
          >
            {showCreate ? "Скрыть форму" : "+ Создать задачу"}
          </button>
          <button
            className="mj-vac-btn mj-vac-btn--ghost"
            onClick={fetchTasks}
            disabled={loading}
          >
            Обновить
          </button>
        </div>

        {showCreate ? (
          <div className="mj-vac-filters" style={{ marginBottom: 18 }}>
            <div className="mj-grid">
              <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                <div className="mj-label">Название</div>
                <input
                  className="mj-vac-input"
                  placeholder="Например: миграция базы на Postgres 15"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                <div className="mj-label">Описание</div>
                <textarea
                  className="mj-vac-input"
                  rows={5}
                  placeholder="Что нужно сделать, какие критерии приёмки"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="mj-field">
                <div className="mj-label">Награда, ₽</div>
                <input
                  className="mj-vac-input"
                  inputMode="numeric"
                  placeholder="0"
                  value={newReward}
                  onChange={(e) => setNewReward(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className="mj-field">
                <div className="mj-label">Дедлайн</div>
                <input
                  type="date"
                  className="mj-vac-input"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </div>
              <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                <div className="mj-label">Требуемые навыки</div>
                <SkillsInput
                  value={newSkillSlugs}
                  onChange={setNewSkillSlugs}
                  placeholder="Например: go, postgresql, docker"
                />
              </div>
            </div>

            {createErr ? (
              <div style={{ color: "#c02838", fontWeight: 800, marginTop: 10 }}>
                {createErr}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <button
                className="mj-vac-btn"
                disabled={createBusy}
                onClick={handleCreate}
              >
                {createBusy ? "Создание…" : "Опубликовать"}
              </button>
              <button
                className="mj-vac-btn mj-vac-btn--ghost"
                disabled={createBusy}
                onClick={() => {
                  resetCreateForm();
                  setShowCreate(false);
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}

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

              <div className="mj-vac-kpi" style={{ marginTop: 8 }}>
                <span className="mj-vac-pill">Награда: {money(t.reward)}</span>
                <span className="mj-vac-pill">{taskStatusLabel(t.status)}</span>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  className="mj-vac-btn"
                  style={{ minHeight: 36, padding: "8px 14px" }}
                  onClick={() => openReview(t)}
                >
                  Решения
                </button>
                <button
                  className="mj-vac-btn mj-vac-btn--ghost"
                  style={{ minHeight: 36, padding: "8px 14px" }}
                  onClick={() => handleDelete(t.id)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>

        {!loading && !error && tasks.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 14 }}>
            Вы пока не создали ни одной задачи.
          </div>
        ) : null}
      </div>

      {activeTask ? (
        <div className="mj-modal-backdrop" onClick={() => setActiveTask(null)}>
          <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mj-modal-header">
              <div>
                <h2 className="mj-modal-title" style={{ marginBottom: 6 }}>
                  Решения по «{activeTask.title}»
                </h2>
                <p className="mj-modal-subtitle">
                  Статус задачи: {taskStatusLabel(activeTask.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTask(null)}
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

            {reviewMsg ? (
              <div style={{ color: "#c02838", fontWeight: 800, marginBottom: 12 }}>
                {reviewMsg}
              </div>
            ) : null}

            {submissions.length === 0 ? (
              <div style={{ opacity: 0.7, fontWeight: 700 }}>
                Пока нет отправленных решений.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {submissions.map((s) => (
                  <SubmissionCard
                    key={s.id}
                    submission={s}
                    busy={reviewBusy === s.id}
                    onReview={(status, comment) => handleReview(s.id, status, comment)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}

function SubmissionCard(props: {
  submission: Submission;
  busy: boolean;
  onReview: (status: 2 | 3, comment: string) => void;
}) {
  const { submission, busy, onReview } = props;
  const [comment, setComment] = useState(submission.review_comment || "");
  const isPending = submission.status === SUBMISSION_STATUS.PENDING;

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 14,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800 }}>Студент: {submission.student_id}</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Отправлено: {submission.submitted_at || "—"} • Статус: {submissionStatusLabel(submission.status)}
          </div>
        </div>
        <a
          href={submission.solution_url}
          target="_blank"
          rel="noreferrer"
          style={{ fontWeight: 800, textDecoration: "underline" }}
        >
          Открыть решение
        </a>
      </div>

      {submission.comment ? (
        <div style={{ marginTop: 10 }}>
          <div className="mj-label">Комментарий студента</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{submission.comment}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <div className="mj-label">Комментарий ревьюера</div>
        <textarea
          className="mj-vac-input"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={!isPending}
          placeholder={isPending ? "Что подсказать студенту" : ""}
        />
      </div>

      {isPending ? (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            className="mj-vac-btn"
            disabled={busy}
            onClick={() => onReview(SUBMISSION_STATUS.APPROVED as 2, comment)}
          >
            {busy ? "…" : "Принять"}
          </button>
          <button
            className="mj-vac-btn mj-vac-btn--ghost"
            disabled={busy}
            onClick={() => onReview(SUBMISSION_STATUS.REJECTED as 3, comment)}
          >
            {busy ? "…" : "Отклонить"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
