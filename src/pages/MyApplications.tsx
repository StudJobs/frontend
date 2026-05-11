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
import { apiGateway } from "../api/apiGateway";
import { useToast } from "../components/ui/Toast";

type VacancyMini = { id: string; title: string };

// Страница «Мои отклики» для студента. Показывает все его активные отклики
// с фильтром по статусу. Для PENDING есть возможность отозвать (withdraw).
export default function MyApplications() {
  const toast = useToast();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 0>(0);
  const [vacancyTitles, setVacancyTitles] = useState<Record<string, string>>({});

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

  // Подгружаем названия вакансий one-by-one. Это не очень эффективно, но в MVP
  // у студента редко больше 10-15 откликов. Кэш на уровне vacancyTitles
  // защищает от повторных запросов при фильтрации статуса.
  useEffect(() => {
    const missing = items
      .map((a) => a.vacancy_id)
      .filter((id) => id && !vacancyTitles[id]);
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
        <h1 className="page-title">Мои отклики</h1>

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
          <div className="empty-state">
            <p>Пока нет откликов.</p>
            <Link className="link" to="/vacancies">
              Посмотреть вакансии →
            </Link>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((a) => {
            const title = vacancyTitles[a.vacancy_id] ?? "Вакансия";
            return (
              <article key={a.id} className="application-card">
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <Link to={`/vacancies?vacancy_id=${encodeURIComponent(a.vacancy_id)}`} className="application-card__title">
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
              </article>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
