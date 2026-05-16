import { useEffect, useMemo, useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/profile-mospolyjob.css";
import "../assets/styles/vacancies-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

import { ExpertAPI } from "../api/expert";
import {
  AchievementItem,
  VERIFICATION_STATUS,
  achievementTypeLabel,
} from "../api/achievements";
import { useToast } from "../components/ui/Toast";
import { UsersAPI, UserListItem } from "../api/users";
import { TasksAPI } from "../api/tasks";
import SkillBadges from "../components/ui/SkillBadges";

type DraftReview = { decision: 3 | 4; comment: string };
type Tab = "queue" | "students";

export default function Expert() {
  const [tab, setTab] = useState<Tab>("queue");
  return (
    <div className="page-frame mj-no-top-divider">
      <Header />
      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Кабинет эксперта</h1>
        <p className="mj-vac-subtitle">
          Подтверждайте достижения, выдавайте студентам мини-квесты по навыкам, общайтесь в чатах.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setTab("queue")}
            className={tab === "queue" ? "chip chip--active" : "chip"}
          >
            Очередь проверки
          </button>
          <button
            type="button"
            onClick={() => setTab("students")}
            className={tab === "students" ? "chip chip--active" : "chip"}
          >
            Студенты и квесты
          </button>
        </div>

        {tab === "queue" ? <QueueTab /> : <StudentsTab />}
      </div>
      <Footer />
    </div>
  );
}

function QueueTab() {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, DraftReview>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [reviewMsg, setReviewMsg] = useState("");
  const toast = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    setError("");
    try {
      const queue = await ExpertAPI.queue(1, 50);
      setItems(queue);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить очередь ревью");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDraft = (id: number, patch: Partial<DraftReview>) => {
    setDrafts((d) => ({
      ...d,
      [id]: { decision: 3, comment: "", ...d[id], ...patch },
    }));
  };

  const handleSend = async (id: number) => {
    const d = drafts[id] ?? { decision: 3 as 3, comment: "" };
    setBusy(id);
    setReviewMsg("");
    try {
      await ExpertAPI.review(id, d.decision, d.comment);
      setItems((arr) => arr.filter((a) => a.numeric_id !== id));
      setDrafts((all) => {
        const next = { ...all };
        delete next[id];
        return next;
      });
      setReviewMsg(
        d.decision === VERIFICATION_STATUS.APPROVED ? "Подтверждено." : "Отклонено."
      );
      if (d.decision === VERIFICATION_STATUS.APPROVED) {
        toast.success(
          "Достижение подтверждено",
          "Студент увидит зелёный бейдж и сможет показать ачивку рекрутерам."
        );
      } else {
        toast.warning("Отклонено", "Комментарий уйдёт студенту, он сможет переделать.");
      }
    } catch (e: any) {
      setReviewMsg(e?.message || "Не удалось отправить решение");
      toast.danger("Не удалось отправить решение", e?.message || "Попробуйте позже.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <h2 style={{ marginTop: 0, marginBottom: 10 }}>Очередь экспертной проверки</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="mj-vac-btn mj-vac-btn--ghost" onClick={fetchQueue} disabled={loading}>
          Обновить
        </button>
        {reviewMsg ? <div style={{ alignSelf: "center", fontWeight: 800 }}>{reviewMsg}</div> : null}
      </div>

      {error && <div style={{ color: "#c02838", fontWeight: 800, marginBottom: 14 }}>{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div style={{ opacity: 0.75, marginTop: 14 }}>Очередь пуста — всё проверено.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((a) => {
          const id = a.numeric_id ?? 0;
          const draft = drafts[id] ?? { decision: 3 as 3, comment: "" };
          const fileExt = (a.file_name || "").split(".").pop()?.toLowerCase() || "";
          const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(fileExt);
          return (
            <article key={id || a.id} className="expert-review-card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-display)" }}>
                    {a.name || a.file_name}
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
                    Тип: {achievementTypeLabel(a.type)} • Файл: {a.file_name}
                  </div>
                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
                    Студент: {a.user_uuid ?? "—"} • Загружено: {a.created_at ?? "—"}
                  </div>
                </div>
              </div>

              {a.url ? (
                <div className="expert-review-card__preview">
                  {isImage ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      <img src={a.url} alt={a.file_name} />
                    </a>
                  ) : null}
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="expert-review-card__file-link">
                    Открыть файл ↗
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--danger)" }}>
                  Не удалось получить URL файла. Проверьте позже.
                </div>
              )}

              {(a.external_url || a.description) && (
                <div className="expert-review-card__extras">
                  {a.external_url && (
                    <>
                      <div className="expert-review-card__extras-title">Ссылка от студента</div>
                      <a href={a.external_url} target="_blank" rel="noopener noreferrer" className="expert-review-card__extras-link">
                        {a.external_url} ↗
                      </a>
                    </>
                  )}
                  {a.description && (
                    <>
                      <div className="expert-review-card__extras-title" style={{ marginTop: a.external_url ? 10 : 0 }}>
                        Описание / контекст
                      </div>
                      <div className="expert-review-card__extras-text">{a.description}</div>
                    </>
                  )}
                </div>
              )}

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={{ fontWeight: 700 }}>
                  <input
                    type="radio"
                    name={`decision-${id}`}
                    checked={draft.decision === VERIFICATION_STATUS.APPROVED}
                    onChange={() => setDraft(id, { decision: 3 })}
                  />{" "}
                  Подтвердить
                </label>
                <label style={{ fontWeight: 700 }}>
                  <input
                    type="radio"
                    name={`decision-${id}`}
                    checked={draft.decision === VERIFICATION_STATUS.REJECTED}
                    onChange={() => setDraft(id, { decision: 4 })}
                  />{" "}
                  Отклонить
                </label>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="mj-label">Комментарий студенту</div>
                <textarea
                  className="mj-vac-input"
                  rows={2}
                  value={draft.comment}
                  onChange={(e) => setDraft(id, { comment: e.target.value })}
                  placeholder={
                    draft.decision === VERIFICATION_STATUS.REJECTED
                      ? "Что нужно исправить"
                      : "Опционально"
                  }
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="mj-vac-btn" disabled={busy === id || !id} onClick={() => handleSend(id)}>
                  {busy === id ? "…" : "Отправить решение"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ───────── Вкладка «Студенты и квесты» ─────────
// Эксперт видит список студентов, их декларированные/подтверждённые навыки.
// По клику на навык — может выдать квест (мини-задание для подтверждения).

function StudentsTab() {
  const toast = useToast();
  const [students, setStudents] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [questFor, setQuestFor] = useState<{ student: UserListItem; slug: string } | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "", deadline: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await UsersAPI.list({ page: 1, limit: 100 });
      setStudents(list.profiles || []);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить студентов");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter(
      (s) =>
        (s.first_name || "").toLowerCase().includes(needle) ||
        (s.last_name || "").toLowerCase().includes(needle) ||
        (s.email || "").toLowerCase().includes(needle) ||
        (s.skill_slugs || []).some((sl) => sl.toLowerCase().includes(needle))
    );
  }, [students, search]);

  async function sendQuest() {
    if (!questFor) return;
    if (!draft.title.trim()) {
      toast.danger("Укажите название квеста");
      return;
    }
    setBusy(true);
    try {
      await TasksAPI.createSkillQuest({
        target_student_id: questFor.student.id!,
        target_skill_slug: questFor.slug,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        deadline: draft.deadline || undefined,
      });
      toast.success("Квест отправлен", `Студент увидит его в «Мои отклики → Квесты». Approve добавит навык в verified.`);
      setQuestFor(null);
      setDraft({ title: "", description: "", deadline: "" });
    } catch (e: any) {
      toast.danger("Не удалось создать квест", e?.error || e?.message || "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        className="mj-vac-input"
        placeholder="Поиск по имени, email или навыку…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", marginBottom: 16 }}
      />

      {loading && <div className="muted">Загрузка…</div>}
      {error && <div className="error">{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((s) => {
          const declared = (s.skill_slugs || []).filter((x) => !(s.verified_skill_slugs || []).includes(x));
          const verified = s.verified_skill_slugs || [];
          return (
            <article key={s.id} className="application-card">
              <header style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {(s.first_name || "") + " " + (s.last_name || "") || s.email || s.id}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {s.email} {s.education_institution ? `• ${s.education_institution}` : ""}
                  </div>
                </div>
              </header>

              {verified.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Подтверждённые навыки</div>
                  <SkillBadges slugs={verified} variant="verified" />
                </div>
              )}

              {declared.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Заявленные (не подтверждены — кликните, чтобы выдать квест)
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {declared.map((sl) => (
                      <button
                        key={sl}
                        type="button"
                        className="chip"
                        title="Дать квест по этому навыку"
                        onClick={() => setQuestFor({ student: s, slug: sl })}
                      >
                        # {sl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {questFor && (
        <div className="mj-modal-backdrop" onClick={() => setQuestFor(null)}>
          <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mj-modal-header">
              <div>
                <h2 className="mj-modal-title" style={{ marginBottom: 6 }}>
                  Квест по навыку «{questFor.slug}»
                </h2>
                <p className="mj-modal-subtitle">
                  Получатель: {questFor.student.first_name || ""} {questFor.student.last_name || questFor.student.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuestFor(null)}
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

            <div className="mj-grid">
              <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                <div className="mj-label">Название</div>
                <input
                  className="mj-vac-input"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Например: подтверди навык Go — мини-задание"
                />
              </div>
              <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                <div className="mj-label">Задание (вопросы, требования, ссылки)</div>
                <textarea
                  className="mj-vac-input"
                  rows={6}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Сформулируйте задание текстом. Можно дать ссылки на материалы."
                />
              </div>
              <div className="mj-field">
                <div className="mj-label">Дедлайн (опц.)</div>
                <input
                  type="date"
                  className="mj-vac-input"
                  value={draft.deadline}
                  onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button
                  type="button"
                  className="mj-vac-btn"
                  disabled={busy || !draft.title.trim()}
                  onClick={sendQuest}
                  style={{ width: "100%", borderRadius: 14, padding: "12px 16px", fontWeight: 900 }}
                >
                  {busy ? "Отправка…" : "Выдать квест"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
