import React, { useEffect, useMemo, useRef, useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";
import "../assets/styles/vacancies-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

import wave from "../assets/images/wave-white.png";
import spiral from "../assets/images/spiral.png";
import checkLong from "../assets/images/check-long.png";

import { apiGateway } from "../api/apiGateway";

import {
  VacanciesAPI,
  VacancyItem,
  VacancyListParams,
  VacancyPagination,
  PositionItem,
} from "../api/vacancies";

const money = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n)
    ? `${new Intl.NumberFormat("ru-RU").format(n)} ₽`
    : "—";

const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));

const pick = (p: PositionItem) =>
  (p.title || p.name || (p as any).value || (p as any).id || "").trim();

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

const WORK_FORMAT_OPTIONS = [
  { value: "", label: "Любой формат" },
  { value: "Офис", label: "Офис" },
  { value: "Удалёнка", label: "Удалёнка" },
  { value: "Гибрид", label: "Гибрид" },
];

const SCHEDULE_OPTIONS = [
  { value: "", label: "Любой график" },
  { value: "5/2", label: "5/2" },
  { value: "2/2", label: "2/2" },
  { value: "3/3", label: "3/3" },
  { value: "Гибкий", label: "Гибкий" },
  { value: "Сменный", label: "Сменный" },
];

const DEFAULT_LIMIT = 9;

const SALARY_MIN = 0;
const SALARY_MAX = 300000;

const formatDateHuman = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const numOrUndef = (x: any): number | undefined => {
  if (x === "" || x === undefined || x === null) return undefined;
  const v = Number(x);
  return Number.isFinite(v) ? v : undefined;
};

const clampSalary = (v: number) =>
  Math.max(SALARY_MIN, Math.min(SALARY_MAX, v));

const readJsonLS = (key: string): any | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getLocalCompanyLike = (): any | null => {
  return (
    readJsonLS("company") ||
    readJsonLS("companyProfile") ||
    readJsonLS("companyMe") ||
    null
  );
};

const getLocalUserLike = (): any | null => {
  return (
    readJsonLS("auth") ||
    readJsonLS("user") ||
    readJsonLS("me") ||
    readJsonLS("profile") ||
    readJsonLS("userProfile") ||
    readJsonLS("hrProfile") ||
    null
  );
};

const getJwtPayload = (): any | null => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);

    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const ROLE_STUDENT = "ROLE_STUDENT";
const ROLE_EMPLOYER = "ROLE_EMPLOYER";
const ROLE_HR = "ROLE_HR";

const normalizeRole = (r: string): string => {
  const s = (r || "").trim();
  if (!s) return "";
  const up = s.toUpperCase();

  if (up === ROLE_STUDENT || up === ROLE_EMPLOYER || up === ROLE_HR) return up;

  if (up === "STUDENT") return ROLE_STUDENT;

  if (up === "HR" || up === "EMPLOYER") return ROLE_HR;

  if (up.startsWith("ROLE_")) return up;

  return "";
};

const roleFromUnknown = (x: any): string => {
  if (!x) return "";

  if (typeof x === "string") return normalizeRole(x);

  if (typeof x === "object") {
    const a = (x as any).authority;
    const r = (x as any).role;
    const n = (x as any).name;
    const t = (x as any).type;

    if (typeof a === "string") return normalizeRole(a);
    if (typeof r === "string") return normalizeRole(r);
    if (typeof n === "string") return normalizeRole(n);
    if (typeof t === "string") return normalizeRole(t);
  }

  return "";
};

const extractRole = (obj: any): string => {
  if (!obj) return "";

  const valid = new Set([ROLE_STUDENT, ROLE_EMPLOYER, ROLE_HR]);

  const directCandidates = [
    obj.role,
    obj.user_role,
    obj.data?.role,
    obj.data?.user_role,

    obj.user?.role,
    obj.user?.user_role,
    obj.user?.data?.role,
    obj.user?.data?.user_role,
  ];

  for (const c of directCandidates) {
    const r = roleFromUnknown(c);
    if (valid.has(r)) return r;
  }

  const arrayCandidates = [
    obj.roles,
    obj.authorities,
    obj.user?.roles,
    obj.user?.authorities,
    obj.data?.roles,
    obj.data?.authorities,
  ];

  for (const arr of arrayCandidates) {
    if (!arr) continue;

    const asSingle = roleFromUnknown(arr);
    if (valid.has(asSingle)) return asSingle;

    if (Array.isArray(arr)) {
      for (const item of arr) {
        const r = roleFromUnknown(item);
        if (valid.has(r)) return r;
      }
    }
  }

  return "";
};

const isEmployer = (obj: any): boolean => extractRole(obj) === ROLE_EMPLOYER;
const isStudent = (obj: any): boolean => extractRole(obj) === ROLE_STUDENT;
const isHr = (obj: any): boolean => extractRole(obj) === ROLE_HR;

const getCompanyId = (v?: VacancyItem | null): string | undefined => {
  if (!v) return undefined;
  const anyV: any = v;
  const id = (anyV.company_id || anyV.companyId || "")?.toString?.().trim?.();
  if (!id || id === "string") return undefined;
  return id;
};

async function fetchCompanyName(companyId: string): Promise<string | undefined> {
  const id = String(companyId || "").trim();
  if (!id || id === "string") return undefined;

  try {
    const resp: any = await apiGateway({
      method: "GET",
      url: `/company/${id}`,
    });

    const obj = resp?.data ?? resp;

    const nm =
      obj?.name ||
      obj?.company?.name ||
      obj?.data?.name ||
      obj?.data?.company?.name;

    if (typeof nm === "string" && nm.trim()) return nm.trim();
  } catch (e) {
    console.error("fetchCompanyName failed:", e);
  }

  return undefined;
}

async function respondToVacancy(vacancyId: string): Promise<void> {
  const id = String(vacancyId || "").trim();
  if (!id) throw new Error("Не найден ID вакансии");

  const attempts: Array<{ url: string; data?: any }> = [
    { url: `/vacancy/${id}/respond` },
    { url: `/vacancy/${id}/response` },
    { url: `/vacancy/${id}/apply` },
    { url: `/vacancies/${id}/respond` },
    { url: `/vacancies/${id}/apply` },
    { url: `/vacancy/respond`, data: { vacancy_id: id } },
    { url: `/vacancy/response`, data: { vacancy_id: id } },
    { url: `/vacancy/apply`, data: { vacancy_id: id } },
  ];

  let lastErr: any = null;

  for (const a of attempts) {
    try {
      await apiGateway({ method: "POST", url: a.url, data: a.data });
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  const msg =
    typeof lastErr === "string"
      ? lastErr
      : lastErr?.message ||
        lastErr?.detail ||
        "Не удалось отправить отклик (нужен правильный endpoint на бэке)";
  throw new Error(msg);
}

export default function Vacancies() {
  const [filters, setFilters] = useState<VacancyListParams>({
    page: 1,
    limit: DEFAULT_LIMIT,
    position_status: "open",

    company_id: "",
    work_format: "",
    schedule: "",
    min_salary: undefined,
    max_salary: undefined,
    min_experience: undefined,
    max_experience: undefined,
    search_title: "",
  });

  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [pagination, setPagination] = useState<VacancyPagination>({});
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [selected, setSelected] = useState<VacancyItem | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [salaryFrom, setSalaryFrom] = useState<string>("");
  const [salaryTo, setSalaryTo] = useState<string>("");

  const [companyNameById, setCompanyNameById] = useState<Record<string, string>>(
    {}
  );

  const companyNameRef = useRef<Record<string, string>>({});
  useEffect(() => {
    companyNameRef.current = companyNameById;
  }, [companyNameById]);

  const companyFetchInFlight = useRef<Record<string, boolean>>({});

  const [responding, setResponding] = useState(false);
  const [respondMessage, setRespondMessage] = useState<string>("");

  const [meApi, setMeApi] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp: any = await apiGateway({
          method: "GET",
          url: "/users/me",
        });
        if (!cancelled) setMeApi(resp?.data ?? resp);
      } catch {
        if (!cancelled) setMeApi(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const meLocal = getLocalUserLike();
  const jwt = getJwtPayload();

  const canRespond = isStudent(meApi) || isStudent(meLocal) || isStudent(jwt);

  const hideListViewButton = isHr(meApi) || isHr(meLocal) || isHr(jwt);

  const currentPage = pagination.current_page ?? (filters.page as any) ?? 1;
  const pages = pagination.pages;
  const total = pagination.total;

  const applyFilters = async (next?: Partial<VacancyListParams>) => {
    const merged: VacancyListParams = {
      ...filters,
      ...(next || {}),
      position_status: "open",
      limit: DEFAULT_LIMIT,
    };

    let minS = numOrUndef(salaryFrom);
    let maxS = numOrUndef(salaryTo);

    if (typeof minS === "number") minS = clampSalary(minS);
    if (typeof maxS === "number") maxS = clampSalary(maxS);

    if (typeof minS === "number" && typeof maxS === "number" && minS > maxS) {
      const tmp = minS;
      minS = maxS;
      maxS = tmp;
    }

    const params: VacancyListParams = {
      page: Math.max(1, Number((merged as any).page || 1)),
      limit: DEFAULT_LIMIT,
      position_status: "open",

      company_id: (merged.company_id as any)?.trim?.() || undefined,
      work_format: (merged.work_format as any)?.trim?.() || undefined,
      schedule: (merged.schedule as any)?.trim?.() || undefined,

      min_salary: minS,
      max_salary: maxS,

      min_experience: numOrUndef((merged as any).min_experience),
      max_experience: numOrUndef((merged as any).max_experience),
      search_title: (merged.search_title as any)?.trim?.() || undefined,
    };

    setFilters({ ...merged, min_salary: minS, max_salary: maxS });

    setLoading(true);
    setError("");

    try {
      const resp = await VacanciesAPI.list(params);
      setPagination(resp.pagination || {});
      setVacancies(resp.vacancies || []);
    } catch (e: any) {
      const msg =
        typeof e === "string"
          ? e
          : e?.message || "Не удалось загрузить вакансии";
      setError(msg);
      setVacancies([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const pos = await VacanciesAPI.positions();
        setPositions(Array.isArray(pos) ? pos : []);
      } catch {
        setPositions([]);
      }
    })();
  }, []);

  const positionOptions = useMemo(() => {
    const list = positions
      .map(pick)
      .filter(Boolean)
      .map((t) => t.trim())
      .filter(Boolean);
    return Array.from(new Set(list)).slice(0, 200);
  }, [positions]);

  const onChange =
    (key: keyof VacancyListParams) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setFilters((s) => ({ ...s, [key]: value as any }));
    };

  const onNumChange =
    (key: keyof VacancyListParams) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setFilters((s) => ({
        ...s,
        [key]: (raw === "" ? undefined : Number(raw)) as any,
      }));
    };

  const reset = () => {
    const base: VacancyListParams = {
      page: 1,
      limit: DEFAULT_LIMIT,
      position_status: "open",
      company_id: "",
      work_format: "",
      schedule: "",
      min_salary: undefined,
      max_salary: undefined,
      min_experience: undefined,
      max_experience: undefined,
      search_title: "",
    };

    setFilters(base);
    setSalaryFrom("");
    setSalaryTo("");
    setShowAdvanced(false);
    applyFilters(base);
  };

  const ensureCompanyName = async (companyId: string) => {
    const id = String(companyId || "").trim();
    if (!id || id === "string") return;

    if (companyNameRef.current[id]) return;
    if (companyFetchInFlight.current[id]) return;

    companyFetchInFlight.current[id] = true;

    try {
      const nm = await fetchCompanyName(id);

      if (nm) {
        setCompanyNameById((m) => ({ ...m, [id]: nm }));
        return;
      }

      const localCompany = getLocalCompanyLike();
      const localId =
        (localCompany?.id ||
          localCompany?.company?.id ||
          localCompany?.data?.id ||
          "")?.toString?.();

      if (localId && localId === id) {
        const fallback =
          localCompany?.name ||
          localCompany?.company?.name ||
          localCompany?.data?.name ||
          undefined;

        if (typeof fallback === "string" && fallback.trim()) {
          setCompanyNameById((m) => ({ ...m, [id]: fallback.trim() }));
        }
      }
    } finally {
      companyFetchInFlight.current[id] = false;
    }
  };

  useEffect(() => {
    const ids = Array.from(
      new Set(
        (vacancies || [])
          .map((v: any) =>
            (v?.company_id || v?.companyId || "").toString().trim()
          )
          .filter((id: string) => id && id !== "string")
      )
    );

    if (!ids.length) return;

    const missing = ids.filter(
      (id) => !companyNameRef.current[id] && !companyFetchInFlight.current[id]
    );
    if (!missing.length) return;

    let cancelled = false;

    (async () => {
      const CONCURRENCY = 6;
      let idx = 0;

      const worker = async () => {
        while (!cancelled) {
          const my = idx++;
          if (my >= missing.length) return;
          await ensureCompanyName(missing[my]);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker)
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancies]);

  useEffect(() => {
    const companyId = getCompanyId(selected);
    if (companyId) void ensureCompanyName(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    setRespondMessage("");
    setResponding(false);
  }, [selected]);

  const attachmentHref = (selected as any)?.attachment_url
    ? (selected as any).attachment_url
    : (selected as any)?.attachment_id
    ? `/api/v1/vacancy/${encodeURIComponent(
        String((selected as any).attachment_id)
      )}`
    : "";

  const selectedCompanyId = getCompanyId(selected);
  const selectedCompanyName =
    (selectedCompanyId && companyNameById[selectedCompanyId]) || undefined;

  const createdAt =
    (selected as any)?.created_at || (selected as any)?.create_at;

  const handleRespond = async () => {
    const id = String((selected as any)?.id || "").trim();
    if (!id) {
      setRespondMessage("Не найден id вакансии");
      return;
    }

    try {
      setResponding(true);
      setRespondMessage("");
      await respondToVacancy(id);
      setRespondMessage("Отклик отправлен ✅");
    } catch (e: any) {
      const msg =
        typeof e === "string"
          ? e
          : e?.message || "Не удалось отправить отклик";
      setRespondMessage(msg);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="page-frame mj-no-top-divider">
      <Header />

      <div className="mj-vac-wrap">
        <h1 className="mj-vac-title">Вакансии</h1>
        <p className="mj-vac-subtitle"></p>

        <div className="mj-vac-filters">
          <div className="mj-vac-filters-row">
            <div>
              <label className="mj-vac-label">Поиск</label>
              {positionOptions.length ? (
                <input
                  className="mj-vac-input"
                  list="positions-list"
                  placeholder="Например: Frontend Developer"
                  value={toStr((filters as any).search_title)}
                  onChange={onChange("search_title")}
                />
              ) : (
                <input
                  className="mj-vac-input"
                  placeholder="Например: Frontend Developer"
                  value={toStr((filters as any).search_title)}
                  onChange={onChange("search_title")}
                />
              )}
            </div>

            <div className="mj-vac-salary-block">
              <label className="mj-vac-label">Зарплата</label>

              <div className="mj-vac-range">
                <input
                  className="mj-vac-input"
                  inputMode="numeric"
                  placeholder="от"
                  value={salaryFrom}
                  onChange={(e) =>
                    setSalaryFrom(e.target.value.replace(/[^\d]/g, ""))
                  }
                />
                <span className="mj-vac-range-sep">—</span>
                <input
                  className="mj-vac-input"
                  inputMode="numeric"
                  placeholder="до"
                  value={salaryTo}
                  onChange={(e) =>
                    setSalaryTo(e.target.value.replace(/[^\d]/g, ""))
                  }
                />
              </div>

              <div className="mj-vac-hint">
                Диапазон {money(SALARY_MIN)} — {money(SALARY_MAX)}.
              </div>
            </div>

            <div className="mj-vac-mini-actions">
              <button
                className="mj-vac-btn"
                disabled={loading}
                onClick={() => applyFilters({ page: 1 })}
              >
                {loading ? "Загрузка…" : "Применить"}
              </button>
              <button
                className="mj-vac-btn mj-vac-btn--ghost"
                disabled={loading}
                onClick={reset}
              >
                Сброс
              </button>
            </div>
          </div>

          {positionOptions.length ? (
            <datalist id="positions-list">
              {positionOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          ) : null}

          <button
            type="button"
            className="mj-vac-toggle"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            <span>
              {showAdvanced
                ? "Скрыть расширенные фильтры"
                : "Показать расширенные фильтры"}
            </span>
            <span style={{ opacity: 0.7 }}>{showAdvanced ? "▲" : "▼"}</span>
          </button>

          {showAdvanced ? (
            <div className="mj-vac-advanced">
              <div className="mj-vac-advanced-grid">
                <div className="mj-vac-field">
                  <label className="mj-vac-label">Формат</label>
                  <select
                    className="mj-vac-select"
                    value={toStr((filters as any).work_format)}
                    onChange={onChange("work_format")}
                  >
                    {WORK_FORMAT_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mj-vac-field">
                  <label className="mj-vac-label">График</label>
                  <select
                    className="mj-vac-select"
                    value={toStr((filters as any).schedule)}
                    onChange={onChange("schedule")}
                  >
                    {SCHEDULE_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mj-vac-field">
                  <label className="mj-vac-label">Опыт от</label>
                  <input
                    className="mj-vac-input"
                    type="number"
                    placeholder="0"
                    value={toStr((filters as any).min_experience)}
                    onChange={onNumChange("min_experience")}
                  />
                </div>

                <div className="mj-vac-field">
                  <label className="mj-vac-label">Опыт до</label>
                  <input
                    className="mj-vac-input"
                    type="number"
                    placeholder="10"
                    value={toStr((filters as any).max_experience)}
                    onChange={onNumChange("max_experience")}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mj-vac-meta">
          <div>
            {typeof total === "number"
              ? `Найдено: ${total}`
              : `Страница: ${currentPage}${
                  typeof pages === "number" ? ` / ${pages}` : ""
                }`}
          </div>

          <div className="mj-vac-pagination">
            <button
              onClick={() =>
                applyFilters({ page: Math.max(1, currentPage - 1) })
              }
              disabled={loading || currentPage <= 1}
            >
              Назад
            </button>
            <button
              onClick={() => applyFilters({ page: currentPage + 1 })}
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
          {vacancies.map((v, idx) => {
            const title = (v.title || "Вакансия").trim();

            const companyId = getCompanyId(v);
            const companyName = (companyId && companyNameById[companyId]) || "";

            const subtitleParts = [
              (v as any).schedule ? `График: ${(v as any).schedule}` : "",
              (v as any).work_format ? `Формат: ${(v as any).work_format}` : "",
            ].filter(Boolean);

            return (
              <article
                key={String((v as any).id || `${title}-${idx}`)}
                className={`hr-card mj-vac-card ${cardVariant(idx)}`}
                onClick={() => setSelected(v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(v);
                }}
              >
                <div className="hr-card-decor" aria-hidden>
                  <img src={cardDecor(idx)} alt="" />
                </div>

                <h3>{title}</h3>

                {companyName ? (
                  <div
                    style={{
                      marginTop: 6,
                      opacity: 0.88,
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {companyName}
                  </div>
                ) : null}

                {!hideListViewButton ? (
                  <div className="hr-card-link">Посмотреть</div>
                ) : null}

                <div className="mj-vac-kpi">
                  <span className="mj-vac-pill">{money((v as any).salary)}</span>
                  <span className="mj-vac-pill">
                    Опыт:{" "}
                    {typeof (v as any).experience === "number"
                      ? `${(v as any).experience}`
                      : "—"}
                  </span>
                  <span className="mj-vac-pill">open</span>
                </div>

                {subtitleParts.length ? (
                  <div
                    style={{
                      marginTop: 10,
                      opacity: 0.92,
                      fontWeight: 750,
                      fontSize: 13,
                    }}
                  >
                    {subtitleParts.join(" • ")}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {!loading && !error && vacancies.length === 0 ? (
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
                <h2 className="mj-modal-title">
                  {((selected as any).title || "Вакансия").trim()}
                </h2>
                <p className="mj-modal-subtitle">
                  Компания: {selectedCompanyName || "—"}
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
                Зарплата: {money((selected as any).salary)}
              </div>
              <div className="mj-chip mj-chip--blue">Статус: open</div>
              <div className="mj-chip">
                Опыт:{" "}
                {typeof (selected as any).experience === "number"
                  ? (selected as any).experience
                  : "—"}
              </div>
            </div>

            <div className="mj-grid">
              <div className="mj-field">
                <div className="mj-label">График</div>
                <div>{(selected as any).schedule || "—"}</div>
              </div>

              <div className="mj-field">
                <div className="mj-label">Формат работы</div>
                <div>{(selected as any).work_format || "—"}</div>
              </div>

              <div className="mj-field">
                <div className="mj-label">Опубликовано</div>
                <div>{formatDateHuman(createdAt)}</div>
              </div>

              <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                <div className="mj-label">Вложение</div>
                {(selected as any).attachment_url ? (
                  <a
                    href={(selected as any).attachment_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть файл
                  </a>
                ) : (selected as any).attachment_id ? (
                  <a href={attachmentHref} target="_blank" rel="noreferrer">
                    Открыть файл
                  </a>
                ) : (
                  <div>—</div>
                )}
              </div>
            </div>

            {canRespond ? (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleRespond}
                  disabled={responding}
                  className="mj-vac-btn"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "12px 16px",
                    fontWeight: 900,
                    cursor: responding ? "not-allowed" : "pointer",
                  }}
                >
                  {responding ? "Отправляем отклик…" : "Откликнуться"}
                </button>

                {respondMessage ? (
                  <div
                    style={{
                      marginTop: 10,
                      fontWeight: 800,
                      color: respondMessage.includes("✅")
                        ? "#1f7a1f"
                        : "#c02838",
                    }}
                  >
                    {respondMessage}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
