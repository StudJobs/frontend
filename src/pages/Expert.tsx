import React, { useEffect, useState } from "react";
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

type DraftReview = { decision: 3 | 4; comment: string };

export default function Expert() {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page] = useState(1);

  const [drafts, setDrafts] = useState<Record<number, DraftReview>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [reviewMsg, setReviewMsg] = useState("");
  const toast = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    setError("");
    try {
      const queue = await ExpertAPI.queue(page, 50);
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
        d.decision === VERIFICATION_STATUS.APPROVED
          ? "Подтверждено."
          : "Отклонено."
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
    <div className="page-frame mj-no-top-divider">
      <Header />

      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Очередь экспертной проверки</h1>
        <p className="mj-vac-subtitle">
          Достижения студентов, ожидающие подтверждения. Решение делает
          портфолио верифицированным или отправляет студента на доработку.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            className="mj-vac-btn mj-vac-btn--ghost"
            onClick={fetchQueue}
            disabled={loading}
          >
            Обновить
          </button>
          {reviewMsg ? (
            <div style={{ alignSelf: "center", fontWeight: 800 }}>{reviewMsg}</div>
          ) : null}
        </div>

        {error ? (
          <div style={{ color: "#c02838", fontWeight: 800, marginBottom: 14 }}>
            {error}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 14 }}>
            Очередь пуста — все достижения уже проверены.
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((a) => {
            const id = a.numeric_id ?? 0;
            const draft = drafts[id] ?? { decision: 3 as 3, comment: "" };
            const fileExt = (a.file_name || "").split(".").pop()?.toLowerCase() || "";
            const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(fileExt);
            return (
              <article key={id || a.id} className="expert-review-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-display)" }}>
                      {a.name || a.file_name}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
                      Тип: {achievementTypeLabel(a.type)} • Файл: {a.file_name}
                    </div>
                    <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
                      Студент: {a.user_uuid ?? "—"} • Загружено:{" "}
                      {a.created_at ?? "—"}
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
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="expert-review-card__file-link"
                    >
                      Открыть файл ↗
                    </a>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 13, color: "var(--danger)" }}>
                    Не удалось получить URL файла. Проверьте позже.
                  </div>
                )}

                {(a.external_url || a.description) ? (
                  <div className="expert-review-card__extras">
                    {a.external_url ? (
                      <>
                        <div className="expert-review-card__extras-title">Ссылка от студента</div>
                        <a
                          href={a.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="expert-review-card__extras-link"
                        >
                          {a.external_url} ↗
                        </a>
                      </>
                    ) : null}
                    {a.description ? (
                      <>
                        <div className="expert-review-card__extras-title" style={{ marginTop: a.external_url ? 10 : 0 }}>
                          Описание / контекст
                        </div>
                        <div className="expert-review-card__extras-text">{a.description}</div>
                      </>
                    ) : null}
                  </div>
                ) : null}

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
                  <button
                    className="mj-vac-btn"
                    disabled={busy === id || !id}
                    onClick={() => handleSend(id)}
                  >
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
