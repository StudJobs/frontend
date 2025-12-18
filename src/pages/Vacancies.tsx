import React, { useEffect, useMemo, useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/candidates-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarFallback from "../assets/images/человек.png";

import { UsersAPI, UserListItem } from "../api/users";

type Pagination = {
  current_page?: number;
  pages?: number;
  total?: number;
};

const normalizeTg = (p: UserListItem) => p.tg || p.telegram;

const isHrLike = (p: UserListItem): boolean => {
  const r = (p.role || "").toLowerCase();
  if (r.includes("hr") || r.includes("employer") || r.includes("company")) return true;

  const cat = (p.profession_category || "").toLowerCase();
  return ["hr", "human resources", "рекрутер", "recruit", "кад"].some((k) => cat.includes(k));
};

export default function Vacancies() {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [category, setCategory] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [pagination, setPagination] = useState<Pagination>({});
  const [profiles, setProfiles] = useState<UserListItem[]>([]);

  const filtered = useMemo(
    () => (profiles || []).filter((p) => !isHrLike(p)),
    [profiles]
  );

  const load = async (opts?: { page?: number; limit?: number; category?: string }) => {
    setLoading(true);
    setError("");
    try {
      const p = opts?.page ?? page;
      const l = opts?.limit ?? limit;
      const c = (opts?.category ?? category).trim();

      const resp = await UsersAPI.list({ page: p, limit: l, ...(c ? { category: c } : {}) });
      setPagination(resp.pagination || {});
      setProfiles(resp.profiles || []);
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e?.message || "Не удалось загрузить кандидатов";
      setError(msg);
      setProfiles([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPage = pagination.current_page ?? page;
  const pages = pagination.pages ?? undefined;
  const total = pagination.total ?? undefined;

  return (
    <div className="page-frame">
      <Header />
      <div className="mj-gradient-divider"></div>

      <div className="mj-list-wrap">
        <h1 className="mj-list-title">Кандидаты</h1>

        <div className="mj-filters">
          <div className="mj-filter-field">
            <label>page (integer)</label>
            <input
              value={page}
              type="number"
              min={1}
              onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="mj-filter-field">
            <label>limit (integer)</label>
            <input
              value={limit}
              type="number"
              min={1}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 10))}
            />
          </div>

          <div className="mj-filter-field">
            <label>category (string)</label>
            <input
              value={category}
              placeholder="category"
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <button
            className="mj-filter-btn"
            onClick={() => load({ page, limit, category })}
            disabled={loading}
          >
            {loading ? "Загрузка…" : "Применить"}
          </button>
        </div>

        <div className="mj-list-meta">
          <div>
            {typeof total === "number"
              ? `Найдено: ${total}`
              : `Страница: ${currentPage}${pages ? ` / ${pages}` : ""}`}
            {filtered.length !== profiles.length ? ` • HR скрыты: ${profiles.length - filtered.length}` : ""}
          </div>

          <div className="mj-pagination">
            <button
              onClick={() => {
                const next = Math.max(1, currentPage - 1);
                setPage(next);
                load({ page: next });
              }}
              disabled={loading || currentPage <= 1}
            >
              Назад
            </button>
            <button
              onClick={() => {
                const next = currentPage + 1;
                setPage(next);
                load({ page: next });
              }}
              disabled={loading || (typeof pages === "number" ? currentPage >= pages : false)}
            >
              Вперёд
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: "rgba(255,255,255,0.9)", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div className="mj-cards-grid">
          {filtered.map((p) => {
            const fullName = `${p.last_name || ""} ${p.first_name || ""}`.trim() || "Без имени";
            const profile = p.profession_category || p.specialization || "—";
            const tg = normalizeTg(p);

            return (
              <article key={p.id || `${fullName}-${p.email || tg || Math.random()}`} className="mj-candidate-card">
                <div className="mj-candidate-top">
                  <img
                    src={p.avatar_url || avatarFallback}
                    className="mj-candidate-avatar"
                    alt="avatar"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = avatarFallback;
                    }}
                  />
                  <div>
                    <div className="mj-candidate-name">{fullName}</div>
                    <div className="mj-candidate-sub">
                      {profile}
                      {p.age ? ` • ${p.age} лет` : ""}
                    </div>
                  </div>
                </div>

                {p.description && <div className="mj-candidate-desc">{p.description}</div>}

                <div className="mj-candidate-links">
                  {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
                  {tg && (
                    <a
                      href={`https://t.me/${String(tg).replace(/^@/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {String(tg).startsWith("@") ? tg : `@${tg}`}
                    </a>
                  )}
                  {p.resume_url && (
                    <a href={p.resume_url} target="_blank" rel="noreferrer">
                      Резюме
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {!loading && !error && filtered.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.75)", marginTop: 14 }}>
            Никого не нашли. Проверь category или попробуй увеличить limit.
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
