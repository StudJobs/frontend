import { useEffect, useState } from "react";
import "../assets/styles/global.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { MembershipAPI } from "../api/membership";
import { CompanyMember } from "../api/users";
import { apiGateway } from "../api/apiGateway";
import { useToast } from "../components/ui/Toast";

type CompanyItem = { id: string; name: string; description?: string };

// HR подаёт заявку быть сотрудником компании. После approve owner-ом — может
// создавать вакансии (будут идти на модерацию owner-а).
export default function HRMembership() {
  const toast = useToast();
  const [my, setMy] = useState<CompanyMember | null>(null);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMy() {
    setMy(await MembershipAPI.my());
  }

  async function searchCompanies(query: string) {
    try {
      const r = await apiGateway<any>({ method: "GET", url: "/company", params: query ? { q: query, limit: 20 } : { limit: 20 } });
      const data = r?.data ?? r;
      const list = data?.companies || data?.items || data || [];
      setCompanies(list.slice(0, 30));
    } catch {
      setCompanies([]);
    }
  }

  useEffect(() => {
    void loadMy();
    void searchCompanies("");
  }, []);

  async function applyTo(c: CompanyItem) {
    setBusy(true);
    try {
      const m = await MembershipAPI.apply(c.id, note);
      setMy(m);
      toast.success("Заявка отправлена", `Owner компании «${c.name}» рассмотрит её в кабинете.`);
    } catch (e: any) {
      toast.danger("Не удалось отправить", e?.error || e?.message || "");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = (s?: number) => {
    if (s === 1) return "На рассмотрении";
    if (s === 2) return "Одобрено";
    if (s === 3) return "Отклонено";
    return "—";
  };

  return (
    <>
      <Header />
      <main className="page-narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className="page-title">Моя компания</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
          Чтобы публиковать вакансии — подайте заявку быть сотрудником компании. После
          одобрения owner-ом ваши вакансии будут уходить на его модерацию перед публикацией.
        </p>

        {my && (
          <section className="application-card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Ваш текущий статус</h2>
            <div style={{ fontSize: 14 }}>
              Компания: <strong>{my.company_id.slice(0, 8)}…</strong> · Статус: <strong>{statusLabel(my.status)}</strong>
            </div>
            {my.note && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Ваша заметка: {my.note}</div>}
          </section>
        )}

        <section className="application-card">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{my?.status === 2 ? "Поменять компанию" : "Подать заявку"}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="mj-vac-input"
              placeholder="Поиск компании по названию"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                void searchCompanies(e.target.value);
              }}
            />
            <input
              className="mj-vac-input"
              placeholder="Заметка для owner-а (опц., например «работаю как Tech Recruiter уже 2 года»)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {companies.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Компаний не найдено.</div>}
            {companies.map((c) => (
              <div key={c.id} style={{ padding: 10, background: "var(--surface-soft)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  {c.description && <div className="muted" style={{ fontSize: 12 }}>{c.description.slice(0, 120)}</div>}
                </div>
                <button type="button" className="btn btn--primary" disabled={busy} onClick={() => applyTo(c)}>
                  Подать заявку
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
