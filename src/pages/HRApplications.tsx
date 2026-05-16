import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../assets/styles/global.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import {
  ApplicationsAPI,
  Application,
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
} from "../api/applications";
import { apiGateway } from "../api/apiGateway";
import { useToast } from "../components/ui/Toast";
import ChatPanel from "../components/ui/ChatPanel";

// HR-доска: отклики на одну конкретную вакансию.
// URL: /hr/applications?vacancy_id=...
//
// Без vacancy_id рисуем пустой стейт с ссылкой на /hr-profile, где HR
// выбирает свою вакансию.
export default function HRApplications() {
  const toast = useToast();
  const [params] = useSearchParams();
  const vacancyId = params.get("vacancy_id") ?? "";

  const [items, setItems] = useState<Application[]>([]);
  const [vacancyTitle, setVacancyTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 0>(0);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  // Простой modal-стейт: id отклика, который ревьюится, и его действие (2|3).
  const [reviewing, setReviewing] = useState<{ id: string; decision: 2 | 3 } | null>(null);
  const [comment, setComment] = useState("");

  async function load() {
    if (!vacancyId) return;
    setLoading(true);
    setError("");
    try {
      const p = statusFilter === 0 ? {} : { status: statusFilter };
      const res = await ApplicationsAPI.listForVacancy(vacancyId, p);
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
  }, [vacancyId, statusFilter]);

  useEffect(() => {
    if (!vacancyId) return;
    (async () => {
      try {
        const resp: any = await apiGateway({ method: "GET", url: `/vacancy/${vacancyId}` });
        const v = resp?.data ?? resp;
        if (v?.title) setVacancyTitle(v.title);
      } catch {
        // ignore
      }
    })();
  }, [vacancyId]);

  useEffect(() => {
    const missing = items
      .map((a) => a.student_id)
      .filter((id) => id && !studentNames[id]);
    if (missing.length === 0) return;
    const uniq = Array.from(new Set(missing));
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        uniq.map(async (sid) => {
          try {
            const resp: any = await apiGateway({ method: "GET", url: `/users/${sid}` });
            const u = resp?.data ?? resp;
            const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.email || sid.slice(0, 8);
            updates[sid] = name;
          } catch {
            // ignore
          }
        })
      );
      if (Object.keys(updates).length) {
        setStudentNames((prev) => ({ ...prev, ...updates }));
      }
    })();
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitReview() {
    if (!reviewing) return;
    try {
      await ApplicationsAPI.review(reviewing.id, reviewing.decision, comment);
      toast.success(reviewing.decision === 2 ? "Кандидат принят" : "Кандидат отклонён");
      setReviewing(null);
      setComment("");
      void load();
    } catch (e: any) {
      toast.danger(e?.message ?? "Не удалось обновить статус");
    }
  }

  const tabs = useMemo(
    () => [
      { value: 0 as const, label: "Все" },
      { value: 1 as const, label: APPLICATION_STATUS_LABELS[1] },
      { value: 2 as const, label: APPLICATION_STATUS_LABELS[2] },
      { value: 3 as const, label: APPLICATION_STATUS_LABELS[3] },
    ],
    []
  );

  return (
    <>
      <Header />
      <main className="page-narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className="page-title">
          Отклики{vacancyTitle ? ` · ${vacancyTitle}` : ""}
        </h1>

        {!vacancyId && (
          <div className="empty-state">
            <p>Не выбрана вакансия. Откройте список вакансий своей компании и выберите одну, чтобы посмотреть отклики.</p>
            <Link to="/hr-profile" className="link">
              Перейти в профиль HR →
            </Link>
          </div>
        )}

        {vacancyId && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {tabs.map((t) => (
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
            {!loading && !error && items.length === 0 && (
              <div className="empty-state">Откликов пока нет.</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((a) => {
                const sname = studentNames[a.student_id] ?? a.student_id.slice(0, 8);
                return (
                  <article key={a.id} className="application-card">
                    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <Link to={`/u/${encodeURIComponent(a.student_id)}`} className="application-card__title">
                          {sname}
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

                    {a.hr_comment && a.status !== 1 && (
                      <div style={{ marginTop: 10 }}>
                        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                          Комментарий HR
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{a.hr_comment}</div>
                      </div>
                    )}

                    {a.status === 1 && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => {
                            setReviewing({ id: a.id, decision: 2 });
                            setComment("");
                          }}
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => {
                            setReviewing({ id: a.id, decision: 3 });
                            setComment("");
                          }}
                        >
                          Отклонить
                        </button>
                      </div>
                    )}

                    <ChatPanel kind="application" rid={a.id} title="Чат с кандидатом" collapsedDefault />
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>

      {reviewing && (
        <div className="modal-backdrop" onClick={() => setReviewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>
              {reviewing.decision === 2 ? "Принять отклик" : "Отклонить отклик"}
            </h2>
            <label className="form-label">
              Комментарий (опционально)
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="form-input"
                placeholder={reviewing.decision === 2 ? "Например: «Свяжемся для интервью»" : "Например: «Слабое портфолио по нужному стеку»"}
              />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn btn--ghost" onClick={() => setReviewing(null)}>
                Отмена
              </button>
              <button type="button" className="btn btn--primary" onClick={submitReview}>
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
