import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";
import "../assets/styles/vacancies-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

import wave from "../assets/images/wave-white.png";
import spiral from "../assets/images/spiral.png";
import checkLong from "../assets/images/check-long.png";

import { apiGateway } from "../api/apiGateway";

type UserProfile = {
  id?: string;
  first_name?: string;
  last_name?: string;
  age?: number;

  email?: string;
  tg?: string;
  telegram?: string;

  description?: string;
  profession_category?: string;

  role?: string;
};

type UsersPagination = {
  total?: number;
  pages?: number;
  current_page?: number;
};

type UsersListResponse = {
  pagination?: UsersPagination;
  profiles?: UserProfile[];
};

const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));

const fullName = (u: UserProfile) =>
  `${toStr(u.last_name).trim()} ${toStr(u.first_name).trim()}`.trim() ||
  toStr(u.first_name).trim() ||
  toStr(u.last_name).trim() ||
  "Пользователь";

const cardVariant = (i: number) => {
  const v = i % 3;
  if (v === 0) return "hr-card--green";
  if (v === 1) return "hr-card--red";
  return "hr-card--purple";
};

const cardDecor = (i: number) => {
  const v = i % 3;
  if (v === 0) return wave;
  if (v === 1) return checkLong;
  return spiral;
};

const normalizeTgLink = (tgLike: string) => {
  const raw = (tgLike || "").trim();
  if (!raw) return "";
  const s = raw.startsWith("@") ? raw.slice(1) : raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://t.me/${s}`;
};

const DEFAULT_LIMIT = 9;

const buildQuery = (params: Record<string, any>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    sp.set(k, s);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
};

const getAuthHeaderSafe = (): Record<string, string> => {
  try {
    const token = localStorage.getItem("token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const isEmployerRole = (role?: string) => {
  const r = toStr(role).toUpperCase();
  return (
    r.includes("EMPLOYER") ||
    r.includes("HR") ||
    r.includes("COMPANY") ||
    r.includes("RECRUITER")
  );
};

const isEmptyUser = (u: UserProfile) => {
  const first = toStr(u.first_name).trim();
  const last = toStr(u.last_name).trim();
  const noRealName = !first && !last;

  const age = typeof u.age === "number" && Number.isFinite(u.age) ? u.age : null;
  const email = toStr(u.email).trim();

  const tg = toStr(u.tg || u.telegram).trim();
  const desc = toStr(u.description).trim();
  const cat = toStr(u.profession_category).trim();

  const hasUseful = !!tg || !!desc || !!cat;
  if (hasUseful) return false;

  const hasOnlyNoise = !!email || age !== null;
  return noRealName && hasOnlyNoise;
};

export default function Users() {
  const navigate = useNavigate();

  const PROFILE_ROUTE_PREFIX = "/profile";

  const [filters, setFilters] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    category: "",
    search_name: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [pagination, setPagination] = useState<UsersPagination>({});
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [selected, setSelected] = useState<UserProfile | null>(null);

  const currentPage = pagination.current_page ?? filters.page ?? 1;
  const pages = pagination.pages;

  const categoryOptions = useMemo(() => {
    const list = (users || [])
      .map((u) => toStr(u.profession_category).trim())
      .filter(Boolean);
    return Array.from(new Set(list)).slice(0, 200);
  }, [users]);

  const goToProfile = (id?: string) => {
    const uid = toStr(id).trim();
    if (!uid) return;
    navigate(`${PROFILE_ROUTE_PREFIX}/${encodeURIComponent(uid)}`);
  };

  const fetchUsers = async (next?: Partial<typeof filters>) => {
    const merged = { ...filters, ...(next || {}) };
    const page = Math.max(1, Number(merged.page || 1));
    const limit = DEFAULT_LIMIT;

    const category = String(merged.category || "").trim();

    setFilters({ ...merged, page, limit });

    setLoading(true);
    setError("");

    try {
      const qs = buildQuery({ page, limit, category });

      const resp: any = await apiGateway({
        method: "GET",
        url: `/users${qs}`,
        headers: {
          ...getAuthHeaderSafe(),
          Accept: "application/json",
        },
      });

      const obj: UsersListResponse = resp?.data ?? resp ?? {};
      const list = Array.isArray(obj.profiles) ? obj.profiles : [];
      const pag = obj.pagination || {};

      setRawUsers(list);
      setPagination(pag);
    } catch (e: any) {
      const msg =
        typeof e === "string"
          ? e
          : e?.detail || e?.message || "Не удалось загрузить пользователей";
      setError(String(msg));
      setRawUsers([]);
      setUsers([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rawUsers.length) {
      setUsers([]);
      return;
    }

    const noEmployers = rawUsers.filter((u) => !isEmployerRole(u.role));
    const nonEmpty = noEmployers.filter((u) => !isEmptyUser(u));

    const searchName = toStr(filters.search_name).trim().toLowerCase();
    const finalList =
      searchName.length > 0
        ? nonEmpty.filter((u) => fullName(u).toLowerCase().includes(searchName))
        : nonEmpty;

    setUsers(finalList);
  }, [rawUsers, filters.search_name]);

  const reset = () => {
    const base = { page: 1, limit: DEFAULT_LIMIT, category: "", search_name: "" };
    setFilters(base);
    fetchUsers(base);
  };

  const openTg = (tgLike?: string) => {
    const href = normalizeTgLink(toStr(tgLike));
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page-frame mj-no-top-divider">
      <Header />

      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Кандидаты</h1>
        <p className="mj-vac-subtitle"></p>

        <div className="mj-vac-filters">
          <div className="mj-vac-filters-row">
            <div>
              <label className="mj-vac-label">Поиск по имени</label>
              <input
                className="mj-vac-input"
                placeholder="Например: Иванов Иван"
                value={toStr(filters.search_name)}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, search_name: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mj-vac-label">Категория</label>
              {categoryOptions.length ? (
                <input
                  className="mj-vac-input"
                  list="cats-list"
                  placeholder="Например: Backend Developer"
                  value={toStr(filters.category)}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, category: e.target.value }))
                  }
                />
              ) : (
                <input
                  className="mj-vac-input"
                  placeholder="Например: Backend Developer"
                  value={toStr(filters.category)}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, category: e.target.value }))
                  }
                />
              )}
            </div>

            <div aria-hidden />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              className="mj-vac-btn"
              disabled={loading}
              onClick={() => fetchUsers({ page: 1 })}
              style={{ minWidth: 260 }}
            >
              {loading ? "Загрузка…" : "Применить"}
            </button>

            <button
              className="mj-vac-btn mj-vac-btn--ghost"
              disabled={loading}
              onClick={reset}
              style={{
                minWidth: 260,
                border: "1px solid rgba(0,0,0,0.22)",
                background: "rgba(0,0,0,0.04)",
                boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0,0,0,0.07)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0,0,0,0.04)";
              }}
            >
              Сброс
            </button>
          </div>

          {categoryOptions.length ? (
            <datalist id="cats-list">
              {categoryOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          ) : null}
        </div>

        <div className="mj-vac-meta">
          <div>Найдено: {users.length}</div>

          <div className="mj-vac-pagination">
            <button
              onClick={() => fetchUsers({ page: Math.max(1, currentPage - 1) })}
              disabled={loading || currentPage <= 1}
            >
              Назад
            </button>
            <button
              onClick={() => fetchUsers({ page: currentPage + 1 })}
              disabled={
                loading ||
                (typeof pages === "number" ? currentPage >= pages : false)
              }
            >
              Вперёд
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ color: "#c02838", fontWeight: 800, marginBottom: 14 }}>
            {error}
          </div>
        ) : null}

        <div className="mj-vac-grid">
          {users.map((u, idx) => {
            const name = fullName(u);
            const category = toStr(u.profession_category).trim();
            const age =
              typeof u.age === "number" && Number.isFinite(u.age) ? u.age : null;

            const email = toStr(u.email).trim();
            const tg = toStr(u.tg || u.telegram).trim();

            return (
              <article
                key={String(u.id || `${name}-${idx}`)}
                className={`hr-card mj-vac-card ${cardVariant(idx)}`}
                onClick={() => setSelected(u)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(u);
                }}
              >
                <div className="hr-card-decor" aria-hidden>
                  <img src={cardDecor(idx)} alt="" />
                </div>

                <h3>{name}</h3>

                {category ? (
                  <div
                    style={{
                      marginTop: 6,
                      opacity: 0.88,
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {category}
                  </div>
                ) : null}

                <div className="hr-card-link">Посмотреть</div>

                <div className="mj-vac-kpi">
                  <span className="mj-vac-pill">
                    Возраст: {age !== null ? age : "—"}
                  </span>
                </div>

                {email || tg ? (
                  <div
                    style={{
                      marginTop: 10,
                      opacity: 0.92,
                      fontWeight: 750,
                      fontSize: 13,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {email ? `Email: ${email}` : ""}
                    {email && tg ? " • " : ""}
                    {tg ? `TG: ${tg}` : ""}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {!loading && !error && users.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 14 }}>
            Ничего не нашли. Попробуй смягчить фильтры.
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mj-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mj-modal-header">
              <div>
                <h2 className="mj-modal-title" style={{ marginBottom: 6 }}>
                  {fullName(selected)}
                </h2>
                <p className="mj-modal-subtitle">
                  Категория: {toStr(selected.profession_category).trim() || "—"} •
                  Возраст: {typeof selected.age === "number" ? selected.age : "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
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

            <div className="mj-chip-row">
              <div className="mj-chip mj-chip--green">
                Категория: {toStr(selected.profession_category).trim() || "—"}
              </div>
              <div className="mj-chip mj-chip--blue">
                Возраст: {typeof selected.age === "number" ? selected.age : "—"}
              </div>
            </div>

            <div className="mj-grid">
              <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                <div className="mj-label">Описание</div>
                <div>{toStr(selected.description).trim() || "—"}</div>
              </div>

              <div className="mj-field">
                <div className="mj-label">Email</div>
                <div>{toStr(selected.email).trim() || "—"}</div>
              </div>

              <div className="mj-field">
                <div className="mj-label">Telegram</div>
                {toStr(selected.tg || selected.telegram).trim() ? (
                  <a
                    href={normalizeTgLink(toStr(selected.tg || selected.telegram))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ textDecoration: "underline", fontWeight: 800 }}
                  >
                    {toStr(selected.tg || selected.telegram).trim()}
                  </a>
                ) : (
                  <div>—</div>
                )}
              </div>
            </div>

            {toStr(selected.tg || selected.telegram).trim() ? (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="mj-vac-btn"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "12px 16px",
                    fontWeight: 900,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openTg(selected.tg || selected.telegram);
                  }}
                >
                  Открыть Telegram
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
