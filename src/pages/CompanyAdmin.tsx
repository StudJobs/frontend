import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { MembershipAPI, VacancyModerationAPI } from "../api/membership";
import { CompanyMember } from "../api/users";
import { VacanciesAPI, VacancyItem } from "../api/vacancies";
import { useToast } from "../components/ui/Toast";
import { getCurrentUserId } from "../api/apiGateway";

// Кабинет владельца компании: модерация HR-сотрудников и вакансий.
// HR-сотрудник подаёт заявку через /hr-profile; вакансии HR ждут approve owner-а.
export default function CompanyAdmin() {
  const toast = useToast();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const myId = getCurrentUserId();

  async function loadMembers() {
    try {
      const list = await MembershipAPI.listMembers();
      setMembers(list);
    } catch {
      // empty
    }
  }

  async function loadPendingVacancies() {
    try {
      const all = await VacanciesAPI.list({ company_id: myId, limit: 100 });
      // PUBLIC list уже отфильтровал PUBLISHED, поэтому здесь надо HR-list.
      const hr = await VacanciesAPI.listHR({ limit: 100 });
      const allItems = (hr?.vacancies || all?.vacancies || []) as VacancyItem[];
      setVacancies(allItems);
    } catch {
      // empty
    }
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadMembers(), loadPendingVacancies()]);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reviewMember(m: CompanyMember, status: 2 | 3) {
    try {
      await MembershipAPI.review(m.id, status);
      toast.success(status === 2 ? "Сотрудник одобрен" : "Заявка отклонена");
      await loadMembers();
    } catch (e: any) {
      toast.danger("Не удалось", e?.error || e?.message || "");
    }
  }

  async function moderate(v: VacancyItem, status: 2 | 3) {
    try {
      await VacancyModerationAPI.moderate(v.id, status);
      toast.success(status === 2 ? "Вакансия опубликована" : "Вакансия отклонена");
      await loadPendingVacancies();
    } catch (e: any) {
      toast.danger("Не удалось", e?.error || e?.message || "");
    }
  }

  const pendingMembers = members.filter((m) => m.status === 1);
  const approvedMembers = members.filter((m) => m.status === 2);
  const pendingVacancies = vacancies.filter((v) => v.moderation_status === 1);
  const publishedHRVacancies = vacancies.filter((v) => v.moderation_status === 2 && v.author_id && v.author_id !== myId);

  return (
    <>
      <Header />
      <main className="page-narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className="page-title">Кабинет владельца компании</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
          Подтверждайте сотрудников HR, модерируйте создаваемые ими вакансии. Студенты
          видят только одобренные вакансии.
        </p>

        {loading && <div className="muted">Загрузка…</div>}

        {/* Заявки на сотрудничество */}
        <section className="application-card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Заявки HR на сотрудничество ({pendingMembers.length})</h2>
          {pendingMembers.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>Новых заявок нет.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingMembers.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 10, background: "var(--surface-soft)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      HR <Link className="link" to={`/u/${encodeURIComponent(m.user_id)}`}>{m.user_id.slice(0, 8)}…</Link>
                    </div>
                    {m.note && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{m.note}</div>}
                    {m.created_at && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                        Заявка от {new Date(m.created_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn--primary" onClick={() => reviewMember(m, 2)}>Одобрить</button>
                    <button type="button" className="btn btn--ghost" onClick={() => reviewMember(m, 3)}>Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Активные сотрудники */}
        <section className="application-card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>HR-сотрудники компании ({approvedMembers.length})</h2>
          {approvedMembers.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>Никого ещё не одобрили.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {approvedMembers.map((m) => (
                <div key={m.id} style={{ padding: "6px 10px", background: "var(--surface-soft)", borderRadius: 6 }}>
                  <Link className="link" to={`/u/${encodeURIComponent(m.user_id)}`}>{m.user_id}</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Вакансии на модерации */}
        <section className="application-card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Вакансии HR на модерации ({pendingVacancies.length})</h2>
          {pendingVacancies.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>Ничего не ждёт одобрения.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingVacancies.map((v) => (
                <div key={v.id} style={{ padding: 12, background: "var(--surface-soft)", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{v.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        ЗП от {v.min_salary || v.salary || 0} ₽ · {v.work_format || "—"} · {v.schedule || "—"}
                      </div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                        Автор: <Link className="link" to={`/u/${encodeURIComponent(v.author_id || "")}`}>{(v.author_id || "").slice(0, 8)}…</Link>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="btn btn--primary" onClick={() => moderate(v, 2)}>Опубликовать</button>
                      <button type="button" className="btn btn--ghost" onClick={() => moderate(v, 3)}>Отклонить</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Опубликованные HR-вакансии */}
        {publishedHRVacancies.length > 0 && (
          <section className="application-card">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Опубликованные вакансии HR ({publishedHRVacancies.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {publishedHRVacancies.map((v) => (
                <div key={v.id} style={{ padding: "6px 10px", background: "var(--surface-soft)", borderRadius: 6 }}>
                  <strong>{v.title}</strong> · автор {(v.author_id || "").slice(0, 8)}…
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
