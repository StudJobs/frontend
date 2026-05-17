import { useEffect, useMemo, useState } from "react";
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
  // Все memberships текущего HR (PENDING+APPROVED). Раньше показывалась только
  // одна (самая активная) — пользователь не видел остальные заявки и не понимал,
  // почему «нельзя подать в несколько компаний» (на самом деле можно — UI скрывал).
  const [mine, setMine] = useState<CompanyMember[]>([]);
  // companyId → name. Подгружаем для каждого membership, чтобы не показывать UUID.
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMy() {
    const list = await MembershipAPI.myAll();
    setMine(list);
    const ids = Array.from(new Set(list.map((m) => m.company_id).filter(Boolean)));
    const updates: Record<string, string> = {};
    await Promise.all(
      ids.map(async (cid) => {
        try {
          const r: any = await apiGateway({ method: "GET", url: `/company/${encodeURIComponent(cid)}` });
          const d = r?.data ?? r;
          if (d?.name) updates[cid] = d.name;
        } catch {
          /* ignore */
        }
      })
    );
    if (Object.keys(updates).length) setNameMap((prev) => ({ ...prev, ...updates }));
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
      await MembershipAPI.apply(c.id, note);
      toast.success("Заявка отправлена", `Owner компании «${c.name}» рассмотрит её в кабинете.`);
      setNote("");
      // Перезагружаем полный список — теперь HR увидит новую запись + старые.
      await loadMy();
    } catch (e: any) {
      toast.danger("Не удалось отправить", e?.error || e?.message || "");
    } finally {
      setBusy(false);
    }
  }

  // Уже отправили заявку в эту компанию? Тогда кнопка «Подать заявку» меняется
  // на статусную плашку — не даём дубль-клику создать путаницу.
  const mineByCompany = useMemo(() => {
    const m: Record<string, CompanyMember> = {};
    mine.forEach((x) => {
      if (x.company_id) m[x.company_id] = x;
    });
    return m;
  }, [mine]);

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
        <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
          Чтобы публиковать вакансии и микрозадачи от имени компании — нужно стать её сотрудником.
        </p>
        <ol
          className="muted"
          style={{
            margin: "0 0 20px 18px",
            padding: 0,
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <li>Найдите вашу компанию в списке ниже и нажмите <strong>«Подать заявку»</strong>.</li>
          <li>Owner компании увидит её в разделе <strong>«Модерация»</strong> и одобрит или отклонит.</li>
          <li>После одобрения у вас появится доступ к <strong>«Мои вакансии»</strong> и <strong>«Микрозадачи»</strong>; каждая ваша вакансия будет уходить owner-у на модерацию перед публикацией.</li>
          <li>Подать заявку можно сразу в несколько компаний — на странице отображается самая активная (одобрена → ожидает одобрения).</li>
        </ol>

        {mine.length > 0 && (
          <section className="application-card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Мои заявки в компании</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mine.map((m) => {
                const name = (m.company_id && nameMap[m.company_id]) || `Компания ${m.company_id.slice(0, 8)}…`;
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: 10,
                      background: "var(--surface-soft)",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{name}</div>
                      {m.note && (
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          Ваша заметка: {m.note}
                        </div>
                      )}
                      {m.status === 2 && (
                        <div style={{ fontSize: 12, marginTop: 4, color: "var(--success, #5db374)" }}>
                          ✓ Одобрено — можно создавать вакансии в «Мои вакансии».
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, alignSelf: "center" }}>
                      <strong>{statusLabel(m.status)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="application-card">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Подать заявку в компанию</h2>
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
            {companies.map((c) => {
              const existing = mineByCompany[c.id];
              return (
                <div key={c.id} style={{ padding: 10, background: "var(--surface-soft)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    {c.description && <div className="muted" style={{ fontSize: 12 }}>{c.description.slice(0, 120)}</div>}
                  </div>
                  {existing ? (
                    <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
                      {statusLabel(existing.status)}
                    </div>
                  ) : (
                    <button type="button" className="btn btn--primary" disabled={busy} onClick={() => applyTo(c)}>
                      Подать заявку
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
