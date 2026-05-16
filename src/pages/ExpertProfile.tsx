import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SkillsInput from "../components/ui/SkillsInput";
import SkillBadges from "../components/ui/SkillBadges";
import { UsersAPI, UserListItem } from "../api/users";
import { apiGateway } from "../api/apiGateway";
import { ExpertiseAPI, ExpertiseTest } from "../api/expertise";
import { useToast } from "../components/ui/Toast";

// Личный кабинет эксперта: декларация навыков + прохождение тестов.
// Без verified-теста эксперт ревьюит только «сертификатные» типы (курсы, хакатоны, курсовые),
// что соответствует здравому смыслу — нельзя оценивать код проекта, не зная языка.
export default function ExpertProfile() {
  const toast = useToast();
  const [profile, setProfile] = useState<UserListItem | null>(null);
  const [editingDeclared, setEditingDeclared] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [testFor, setTestFor] = useState<string | null>(null);

  async function loadProfile() {
    try {
      const me = await UsersAPI.me(true);
      setProfile(me?.profile || null);
      setEditingDeclared(me?.profile?.expert_skill_slugs || []);
    } catch {
      // показывать ниже
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  const declared = profile?.expert_skill_slugs || [];
  const verified = profile?.expert_verified_skill_slugs || [];
  const verifiedSet = useMemo(() => new Set(verified), [verified]);

  async function saveDeclared() {
    setBusy(true);
    try {
      await apiGateway({
        method: "PATCH",
        url: "/users/edit",
        data: { expert_skill_slugs: editingDeclared },
      });
      UsersAPI.clearMeCache();
      await loadProfile();
      toast.success("Сохранено", "Чтобы получить право ревьюить проекты по навыку — пройдите тест.");
    } catch (e: any) {
      toast.danger("Не удалось сохранить", e?.error || e?.message || "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-frame mj-no-top-divider">
      <Header />
      <main className="page-narrow" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className="page-title">Личный кабинет эксперта</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
          Эксперт может ревьюить заявки только по подтверждённым навыкам. Заявки
          на сертификаты, дипломы хакатонов и курсовые работы доступны всегда.
        </p>

        {/* Блок: подтверждённая экспертиза */}
        <section className="application-card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Подтверждённая экспертиза</h2>
          {verified.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              Пока ни один навык не подтверждён тестом. Добавьте навыки ниже и пройдите тест.
            </div>
          ) : (
            <SkillBadges slugs={verified} variant="verified" />
          )}
        </section>

        {/* Блок: декларация навыков */}
        <section className="application-card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Заявленные навыки экспертизы</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
            Эти навыки эксперт берётся валидировать. Пока навык не подтверждён тестом,
            ревью «проектных» ачивок (PET_PROJECT, заявки на навыки) по нему запрещено.
          </p>
          <SkillsInput value={editingDeclared} onChange={setEditingDeclared} placeholder="Например: go, react, postgresql" />
          {editingDeclared.join(",") !== declared.join(",") && (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button type="button" className="btn btn--primary" disabled={busy} onClick={saveDeclared}>
                {busy ? "Сохранение…" : "Сохранить"}
              </button>
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setEditingDeclared(declared)}>
                Отменить
              </button>
            </div>
          )}

          {declared.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Статус каждого навыка:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {declared.map((slug) => {
                  const isVerified = verifiedSet.has(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      className={isVerified ? "chip chip--active" : "chip"}
                      onClick={() => !isVerified && setTestFor(slug)}
                      disabled={isVerified}
                      style={{ cursor: isVerified ? "default" : "pointer" }}
                      title={isVerified ? "Подтверждено тестом" : "Пройти тест по этому навыку"}
                    >
                      # {slug} {isVerified ? "· подтверждено ✓" : "· пройти тест"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="application-card">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Что можно ревьюить сейчас</h2>
          <ul style={{ paddingLeft: 18, fontSize: 14 }}>
            <li>Сертификаты курсов, дипломы хакатонов, курсовые работы — <strong>всегда</strong>.</li>
            <li>
              Заявки на навыки (тип «Подтверждение навыка») и пет-проекты со skill_slug —{" "}
              <strong>только по подтверждённым выше навыкам</strong>.
            </li>
            <li>
              Перейти в <Link className="link" to="/expert">очередь проверки</Link>, чтобы начать ревью.
            </li>
          </ul>
        </section>

        {testFor && (
          <TestModal slug={testFor} onClose={() => setTestFor(null)} onPassed={() => { setTestFor(null); void loadProfile(); }} />
        )}
      </main>
      <Footer />
    </div>
  );
}

// Модалка прохождения теста.
function TestModal({ slug, onClose, onPassed }: { slug: string; onClose: () => void; onPassed: () => void }) {
  const toast = useToast();
  const [test, setTest] = useState<ExpertiseTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await ExpertiseAPI.getTest(slug);
        if (!cancelled) setTest(t);
      } catch (e: any) {
        if (!cancelled) toast.danger("Не удалось загрузить тест", e?.error || e?.message || "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function submit() {
    if (!test || !test.available) return;
    const total = test.questions.length;
    const indices: number[] = [];
    for (let i = 0; i < total; i++) {
      indices.push(answers[i] ?? -1);
    }
    setBusy(true);
    try {
      const res = await ExpertiseAPI.submitTest(slug, indices);
      setResult(res.message);
      if (res.passed) {
        toast.success("Тест пройден", res.message);
        setTimeout(onPassed, 600);
      } else {
        toast.warning("Тест не пройден", res.message);
      }
    } catch (e: any) {
      toast.danger("Ошибка отправки", e?.error || e?.message || "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={() => !busy && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--surface)", padding: 22, borderRadius: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
            Тест по навыку #{slug}
          </h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Закрыть
          </button>
        </div>

        {!test ? (
          <div className="muted">Загрузка теста…</div>
        ) : !test.available ? (
          <div className="error">{test.reason || "Тест по этому навыку пока недоступен."}</div>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13 }}>
              Порог прохождения: ≥ {test.pass_threshold_pct}%. Каждый вопрос — один правильный ответ.
            </p>
            <ol style={{ paddingLeft: 20 }}>
              {test.questions.map((q) => (
                <li key={q.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{q.text}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {q.options.map((opt, idx) => (
                      <label key={idx} style={{ cursor: "pointer" }}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === idx}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                        />{" "}
                        {opt}
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            {result && (
              <div style={{ padding: 10, background: "var(--surface-soft)", borderRadius: 8, marginBottom: 10, fontWeight: 700 }}>
                {result}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy || Object.keys(answers).length < test.questions.length}
                onClick={submit}
              >
                {busy ? "Проверка…" : "Отправить ответы"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
                Отмена
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
