import React, { useEffect, useMemo, useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";
import "../assets/styles/vacancies-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

import wave from "../assets/images/wave-white.png";
import spiral from "../assets/images/spiral.png";
import checkLong from "../assets/images/check-long.png";

import { apiGateway } from "../api/apiGateway";

type CompanyTypeObj = { value?: string } | string;

type CompanyItem = {
  id?: string;
  name?: string;
  description?: string;
  city?: string;
  site?: string;
  type?: CompanyTypeObj;

  logo_url?: string;
  image_url?: string;
  avatar_url?: string;
};

type CompanyPagination = {
  total?: number;
  pages?: number;
  current_page?: number;
};

type CompanyListResponse = {
  companies?: CompanyItem[];
  pagination?: CompanyPagination;
};

type LocalCompanyStorage = {
  logo?: {
    original_name: string;
    mime: string;
    size: number;
    dataUrl: string;
    created_at: number;
  };
  documents?: any[];
};

const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));
const isStr = (v: any) => typeof v === "string" && v.trim().length > 0;

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const companyLocalKey = (companyId: string) => `company_local_${companyId}`;

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

const pickType = (c: CompanyItem) => {
  const t: any = (c as any)?.type;
  const v =
    (typeof t === "string" ? t : t?.value) ||
    (c as any)?.company_type ||
    (c as any)?.type_value ||
    "";
  return String(v || "").trim();
};

const normalizeUrl = (url: string) => {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
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

const isCompanyNotEmpty = (c: CompanyItem): boolean => {
  const hasName = toStr(c.name).trim().length > 0;
  if (!hasName) return false;

  const hasAnyExtra =
    toStr(c.description).trim().length > 0 ||
    toStr(c.city).trim().length > 0 ||
    toStr(c.site).trim().length > 0 ||
    pickType(c).length > 0;

  return hasAnyExtra;
};

const getCompanyLogoDataUrl = (companyId?: string | null): string => {
  const id = toStr(companyId).trim();
  if (!id) return "";

  const rawLocal = localStorage.getItem(companyLocalKey(id));
  const parsed = safeJsonParse<LocalCompanyStorage>(rawLocal, {});
  const fromLocal = parsed?.logo?.dataUrl;
  if (isStr(fromLocal)) return fromLocal.trim();

  const legacy = localStorage.getItem(`company_logo_${id}`);
  return isStr(legacy) ? legacy.trim() : "";
};

const pickBackendLogoUrl = (c: CompanyItem) =>
  toStr(c.logo_url).trim() ||
  toStr(c.image_url).trim() ||
  toStr(c.avatar_url).trim() ||
  "";

export default function Companies() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    city: "",
    type: "",
    search_name: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [pagination, setPagination] = useState<CompanyPagination>({});
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selected, setSelected] = useState<CompanyItem | null>(null);

  const currentPage = pagination.current_page ?? filters.page ?? 1;
  const pages = pagination.pages;
  const total = pagination.total;

  const cityOptions = useMemo(() => {
    const list = (companies || []).map((c) => toStr(c.city).trim()).filter(Boolean);
    return Array.from(new Set(list)).slice(0, 200);
  }, [companies]);

  const typeOptions = useMemo(() => {
    const list = (companies || []).map((c) => pickType(c)).filter(Boolean);
    return Array.from(new Set(list)).slice(0, 200);
  }, [companies]);

  const fetchCompanies = async (next?: Partial<typeof filters>) => {
    const merged = { ...filters, ...(next || {}) };
    const page = Math.max(1, Number(merged.page || 1));
    const limit = DEFAULT_LIMIT;

    const city = String(merged.city || "").trim();
    const type = String(merged.type || "").trim();
    const searchName = String(merged.search_name || "").trim();

    setFilters({ ...merged, page, limit });

    setLoading(true);
    setError("");

    try {
      const qs = buildQuery({ page, limit, city, type });

      const obj = await apiGateway<CompanyListResponse>({
        method: "GET",
        url: `/company${qs}`,
        headers: {
          ...getAuthHeaderSafe(),
          Accept: "application/json",
        },
      });

      const listRaw = Array.isArray(obj?.companies) ? obj.companies : [];
      const pag = obj?.pagination || {};

      const listClean = listRaw.filter(isCompanyNotEmpty);

      const filtered =
        searchName.length > 0
          ? listClean.filter((c) =>
              toStr(c.name).toLowerCase().includes(searchName.toLowerCase())
            )
          : listClean;

      setCompanies(filtered);
      setPagination(pag);
    } catch (e: any) {
      const msg =
        typeof e === "string" ? e : e?.detail || e?.message || "Не удалось загрузить компании";
      setError(String(msg));
      setCompanies([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange =
    (key: keyof typeof filters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((s) => ({ ...s, [key]: e.target.value }));
    };

  const reset = () => {
    const base = { page: 1, limit: DEFAULT_LIMIT, city: "", type: "", search_name: "" };
    setFilters(base);
    fetchCompanies(base);
  };

  const openCompanySite = (site?: string) => {
    const href = normalizeUrl(toStr(site));
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const companyImg = (c: CompanyItem) => {
    const id = toStr(c.id).trim();
    return getCompanyLogoDataUrl(id) || pickBackendLogoUrl(c);
  };

  return (
    <div className="page-frame mj-no-top-divider">
      <Header />

      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Компании</h1>
        <p className="mj-vac-subtitle"></p>

        <div className="mj-vac-filters">
          <div className="mj-vac-filters-row">
            <div>
              <label className="mj-vac-label">Поиск по названию</label>
              <input
                className="mj-vac-input"
                placeholder="Например: Мосполитех"
                value={toStr(filters.search_name)}
                onChange={onChange("search_name")}
              />
            </div>

            <div>
              <label className="mj-vac-label">Город</label>
              {cityOptions.length ? (
                <input
                  className="mj-vac-input"
                  list="cities-list"
                  placeholder="Москва"
                  value={toStr(filters.city)}
                  onChange={onChange("city")}
                />
              ) : (
                <input
                  className="mj-vac-input"
                  placeholder="Москва"
                  value={toStr(filters.city)}
                  onChange={onChange("city")}
                />
              )}
            </div>

            <div>
              <label className="mj-vac-label">Тип компании</label>
              {typeOptions.length ? (
                <input
                  className="mj-vac-input"
                  list="types-list"
                  placeholder="Например: ВУЗ / IT / Банк"
                  value={toStr(filters.type)}
                  onChange={onChange("type")}
                />
              ) : (
                <input
                  className="mj-vac-input"
                  placeholder="Например: ВУЗ / IT / Банк"
                  value={toStr(filters.type)}
                  onChange={onChange("type")}
                />
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <button
              className="mj-vac-btn"
              disabled={loading}
              onClick={() => fetchCompanies({ page: 1 })}
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
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)";
              }}
            >
              Сброс
            </button>
          </div>

          {cityOptions.length ? (
            <datalist id="cities-list">
              {cityOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          ) : null}

          {typeOptions.length ? (
            <datalist id="types-list">
              {typeOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          ) : null}
        </div>

        <div className="mj-vac-meta">
          <div>
            {typeof total === "number"
              ? `Найдено: ${total}`
              : `Страница: ${currentPage}${typeof pages === "number" ? ` / ${pages}` : ""}`}
          </div>

          <div className="mj-vac-pagination">
            <button
              onClick={() => fetchCompanies({ page: Math.max(1, currentPage - 1) })}
              disabled={loading || currentPage <= 1}
            >
              Назад
            </button>
            <button
              onClick={() => fetchCompanies({ page: currentPage + 1 })}
              disabled={loading || (typeof pages === "number" ? currentPage >= pages : false)}
            >
              Вперёд
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ color: "#c02838", fontWeight: 800, marginBottom: 14 }}>{error}</div>
        ) : null}

        <div className="mj-vac-grid">
          {companies.map((c, idx) => {
            const name = (c.name || "Компания").trim();
            const city = toStr(c.city).trim();
            const type = pickType(c);
            const img = companyImg(c);

            return (
              <article
                key={String(c.id || `${name}-${idx}`)}
                className={`hr-card mj-vac-card ${cardVariant(idx)}`}
                onClick={() => setSelected(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(c);
                }}
                style={{ position: "relative", overflow: "hidden" }}
              >
                {img ? (
                  <>
                    <img
                      src={img}
                      alt=""
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        zIndex: 0,
                        transform: "scale(1.02)",
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.30) 100%)",
                        zIndex: 1,
                      }}
                    />
                  </>
                ) : null}

                <div className="hr-card-decor" aria-hidden style={{ position: "relative", zIndex: 2 }}>
                  <img src={cardDecor(idx)} alt="" />
                </div>

                <div style={{ position: "relative", zIndex: 3 }}>
                  <h3>{name}</h3>

                  {city ? (
                    <div style={{ marginTop: 6, opacity: 0.88, fontWeight: 800, fontSize: 13 }}>
                      {city}
                    </div>
                  ) : null}

                  <div className="hr-card-link">Посмотреть</div>

                  <div className="mj-vac-kpi">
                    <span className="mj-vac-pill">{type || "—"}</span>
                    <span className="mj-vac-pill">Сайт: {toStr(c.site).trim() ? "есть" : "—"}</span>
                  </div>

                  {toStr(c.description).trim() ? (
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
                      {toStr(c.description)}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {!loading && !error && companies.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 14 }}>Ничего не нашли. Попробуй смягчить фильтры.</div>
        ) : null}
      </div>

      {selected ? (
        <div className="mj-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="mj-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative", overflow: "hidden" }}>
            {companyImg(selected) ? (
              <>
                <img
                  src={companyImg(selected)}
                  alt=""
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    zIndex: 0,
                    transform: "scale(1.02)",
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,255,255,0.86)",
                    zIndex: 1,
                  }}
                />
              </>
            ) : null}

            <div style={{ position: "relative", zIndex: 2 }}>
              <div className="mj-modal-header">
                <div>
                  <h2 className="mj-modal-title">{(selected.name || "Компания").trim()}</h2>
                  <p className="mj-modal-subtitle">
                    Город: {toStr(selected.city).trim() || "—"} • Тип: {pickType(selected) || "—"}
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
                <div className="mj-chip mj-chip--green">Тип: {pickType(selected) || "—"}</div>
                <div className="mj-chip mj-chip--blue">Город: {toStr(selected.city).trim() || "—"}</div>
                <div className="mj-chip">Сайт: {toStr(selected.site).trim() ? "есть" : "—"}</div>
              </div>

              <div className="mj-grid">
                <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                  <div className="mj-label">Описание</div>
                  <div>{toStr(selected.description).trim() || "—"}</div>
                </div>

                <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                  <div className="mj-label">Сайт</div>

                  {toStr(selected.site).trim() ? (
                    <button
                      type="button"
                      className="mj-vac-btn mj-vac-btn--ghost"
                      style={{
                        width: "100%",
                        borderRadius: 14,
                        padding: "12px 16px",
                        fontWeight: 900,
                        cursor: "pointer",
                        border: "1px solid rgba(0,0,0,0.18)",
                        background: "rgba(0,0,0,0.04)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCompanySite(selected.site);
                      }}
                    >
                      Открыть сайт
                    </button>
                  ) : (
                    <div>—</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
