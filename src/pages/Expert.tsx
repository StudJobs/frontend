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
  ACHIEVEMENT_TYPE_SKILL_VERIFICATION,
  achievementTypeLabel,
} from "../api/achievements";
import { useToast } from "../components/ui/Toast";
import { UsersAPI } from "../api/users";
import { apiGateway } from "../api/apiGateway";
import SkillsInput from "../components/ui/SkillsInput";
import SkillBadges from "../components/ui/SkillBadges";

type DraftReview = { decision: 3 | 4; comment: string };

export default function Expert() {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, DraftReview>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [reviewMsg, setReviewMsg] = useState("");
  const toast = useToast();

  // Профиль самого эксперта — чтобы знать его expert_skill_slugs.
  const [expertSkills, setExpertSkills] = useState<string[]>([]);
  const [editingSkills, setEditingSkills] = useState<string[]>([]);
  const [skillsBusy, setSkillsBusy] = useState(false);

  // Фильтры очереди.
  const [filterByMine, setFilterByMine] = useState<boolean>(true);
  const [filterSlugs, setFilterSlugs] = useState<string[]>([]); // временный расширенный фильтр
  const [onlySkillRequests, setOnlySkillRequests] = useState<boolean>(false);

  async function fetchProfile() {
    try {
      const me = await UsersAPI.me(true);
      const skills = me?.profile?.expert_skill_slugs || [];
      setExpertSkills(skills);
      setEditingSkills(skills);
    } catch {
      // эксперт без профиля — без фильтра
    }
  }

  async function fetchQueue() {
    setLoading(true);
    setError("");
    try {
      const queue = await ExpertAPI.queue(1, 100);
      setItems(queue);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить очередь ревью");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchProfile();
    void fetchQueue();
  }, []);

  async function saveExpertSkills() {
    setSkillsBusy(true);
    try {
      await apiGateway({
        method: "PATCH",
        url: "/users/edit",
        data: { expert_skill_slugs: editingSkills },
      });
      setExpertSkills(editingSkills);
      // Сбрасываем кэш /users/me чтобы следующий fetchProfile получил свежие данные.
      UsersAPI.clearMeCache();
      toast.success("Сохранено", "Очередь теперь фильтруется по вашим навыкам.");
    } catch (e: any) {
      toast.danger("Не удалось сохранить", e?.error || e?.message || "");
    } finally {
      setSkillsBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const activeFilter =
      filterSlugs.length > 0 ? filterSlugs : filterByMine ? expertSkills : [];
    return items.filter((a) => {
      if (onlySkillRequests && a.type !== ACHIEVEMENT_TYPE_SKILL_VERIFICATION) return false;
      if (activeFilter.length === 0) return true;
      // Если у заявки есть skill_slug — фильтруем по нему. Если нет (обычная ачивка
      // без skill-тега) — показываем когда фильтр пуст или onlySkillRequests=false.
      if (a.skill_slug) return activeFilter.includes(a.skill_slug);
      // Обычные ачивки без skill_slug пропускаем, если активен фильтр по навыкам.
      return false;
    });
  }, [items, filterSlugs, filterByMine, expertSkills, onlySkillRequests]);

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
          "Решение принято",
          "Если это была заявка на навык — он автоматически добавлен в подтверждённые у студента."
        );
      } else {
        toast.warning("Отклонено", "Студент увидит комментарий и сможет переотправить заявку.");
      }
    } catch (e: any) {
      setReviewMsg(e?.message || "Не удалось отправить решение");
      toast.danger("Не удалось отправить решение", e?.message || "Попробуйте позже.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-frame mj-no-top-divider">
      <Header />

      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Очередь экспертной проверки</h1>
        <p className="mj-vac-subtitle">
          Подтверждайте заявки на навыки и достижения студентов. Используйте фильтр
          по своим навыкам — эксперт не обязан проверять всё.
        </p>

        {/* Блок «Мои навыки эксперта» */}
        <div className="mj-vac-filters" style={{ marginBottom: 18 }}>
          <div className="mj-label" style={{ marginBottom: 6 }}>
            Моя экспертиза (по этим навыкам очередь фильтруется по умолчанию)
          </div>
          <SkillsInput value={editingSkills} onChange={setEditingSkills} placeholder="Например: go, react, postgresql" />
          {editingSkills.join(",") !== expertSkills.join(",") && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button className="mj-vac-btn" onClick={saveExpertSkills} disabled={skillsBusy}>
                {skillsBusy ? "Сохранение…" : "Сохранить экспертизу"}
              </button>
              <button className="mj-vac-btn mj-vac-btn--ghost" onClick={() => setEditingSkills(expertSkills)}>
                Отменить
              </button>
            </div>
          )}
          {expertSkills.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <SkillBadges slugs={expertSkills} variant="verified" />
            </div>
          )}
        </div>

        {/* Фильтры очереди */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
            <input
              type="checkbox"
              checked={filterByMine}
              onChange={(e) => setFilterByMine(e.target.checked)}
              style={{ accentColor: "var(--brand)" }}
            />
            Только мои навыки
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
            <input
              type="checkbox"
              checked={onlySkillRequests}
              onChange={(e) => setOnlySkillRequests(e.target.checked)}
              style={{ accentColor: "var(--brand)" }}
            />
            Только заявки на навыки
          </label>
          <button className="mj-vac-btn mj-vac-btn--ghost" onClick={fetchQueue} disabled={loading}>
            Обновить
          </button>
          {reviewMsg && <div style={{ fontWeight: 800 }}>{reviewMsg}</div>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
            Расширенный фильтр (поверх «Моих»): какие навыки взять временно
          </div>
          <SkillsInput value={filterSlugs} onChange={setFilterSlugs} placeholder="Оставьте пустым = брать только из «Моих»" />
        </div>

        {error && <div style={{ color: "#c02838", fontWeight: 800, marginBottom: 14 }}>{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ opacity: 0.75, marginTop: 14 }}>
            {items.length === 0 ? "Очередь пуста — всё проверено." : "По вашим фильтрам ничего нет."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((a) => {
            const id = a.numeric_id ?? 0;
            const draft = drafts[id] ?? { decision: 3 as 3, comment: "" };
            const fileExt = (a.file_name || "").split(".").pop()?.toLowerCase() || "";
            const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(fileExt);
            const isSkillRequest = a.type === ACHIEVEMENT_TYPE_SKILL_VERIFICATION;
            return (
              <article key={id || a.id} className="expert-review-card">
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-display)" }}>
                      {isSkillRequest
                        ? `Заявка на навык: #${a.skill_slug || "?"}`
                        : a.name || a.file_name}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
                      {isSkillRequest ? "Подтверждение навыка" : `Тип: ${achievementTypeLabel(a.type)}`} • Файл: {a.file_name}
                    </div>
                    <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
                      Студент: {a.user_uuid ?? "—"} • Загружено: {a.created_at ?? "—"}
                    </div>
                  </div>
                  {isSkillRequest && a.skill_slug && (
                    <span className="chip chip--active" style={{ alignSelf: "flex-start" }}>
                      # {a.skill_slug}
                    </span>
                  )}
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
                          Контекст от студента
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
      </div>

      <Footer />
    </div>
  );
}
