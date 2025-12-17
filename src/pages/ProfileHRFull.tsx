import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarFallback from "../assets/images/человек.png";
import wave from "../assets/images/wave-white.png";
import spiral from "../assets/images/spiral.png";
import checkLong from "../assets/images/check-long.png";

import { apiGateway } from "../api/apiGateway";
import { AchievementsAPI, AchievementItem } from "../api/achievements";

type UserProfile = {
  first_name?: string;
  last_name?: string;
  age?: number;
  email?: string;
  telegram?: string;
  tg?: string;
  description?: string;
  profession_category?: string;
  specialization?: string;

  avatar_url?: string;
  avatar_id?: string;
};

type CompanyType = {
  value?: string;
};

type CompanyItem = {
  id?: string;
  name?: string;
  city?: string;
  description?: string;
  site?: string;
  type?: CompanyType;
  logo_id?: string;
  logo_url?: string;
};

type VacancyItem = {
  id?: string;
  title?: string;
  salary?: number;
  schedule?: string;
  work_format?: string;
  experience?: number;
  position_status?: string;
  company_id?: string;
  create_at?: string;

  attachment_id?: string;
  attachment_url?: string;
};

const unwrap = (resp: any) => resp?.data ?? resp ?? {};

const AVATAR_PREFIX = "user_avatar_";
const hasAvatarPrefix = (v?: string | null) =>
  !!v && String(v).startsWith(AVATAR_PREFIX);

const decorPack = [
  { color: "green", decor: spiral },
  { color: "purple", decor: checkLong },
  { color: "red", decor: wave },
];

const normalizeCompany = (raw: any): CompanyItem => {
  const c = raw ?? {};
  return {
    id: c.id ?? c.company_id ?? c.uuid ?? "",
    name: c.name ?? c.title ?? "",
    city: c.city ?? "",
    description: c.description ?? "",
    site: c.site ?? c.website ?? "",
    type: c.type ?? (c.type_value ? { value: c.type_value } : undefined),
    logo_id: c.logo_id ?? "",
    logo_url: c.logo_url ?? c.logo ?? "",
  };
};

const normalizeVacancy = (raw: any): VacancyItem => {
  const v = raw ?? {};
  const toNum = (x: any) => {
    if (x === null || x === undefined || x === "") return undefined;
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    id: v.id ?? v.vacancy_id ?? v.uuid ?? "",
    title: v.title ?? "",
    salary: typeof v.salary === "number" ? v.salary : toNum(v.salary),
    schedule: v.schedule ?? "",
    work_format: v.work_format ?? "",
    experience:
      typeof v.experience === "number" ? v.experience : toNum(v.experience),
    position_status: v.position_status ?? "",
    company_id: v.company_id ?? "",
    create_at: v.create_at ?? v.created_at ?? v.createdAt ?? "",

    attachment_id: v.attachment_id ?? "",
    attachment_url: v.attachment_url ?? "",
  };
};

const pickCompanyId = (data: any): string | null => {
  const d = data?.company ?? data?.data ?? data?.result ?? data;
  const id = d?.id ?? d?.company_id ?? d?.uuid;
  return id ? String(id) : null;
};

async function authFetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; text?: string }> {
  const token = localStorage.getItem("token") || "";
  const resp = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = (await resp.json().catch(() => null)) as T | null;
    return { ok: resp.ok, status: resp.status, data: data ?? undefined };
  }

  const text = await resp.text().catch(() => "");
  return { ok: resp.ok, status: resp.status, text };
}

async function fetchCompaniesStrict(): Promise<CompanyItem[]> {
  const urls = [
    `/api/v1/company/me`,
    `/api/v1/company`,
    `/api/v1/companies/me`,
    `/api/v1/companies`,
  ];

  let lastErr: any = null;

  for (const url of urls) {
    const r = await authFetchJson(url, { method: "GET" });

    if (r.status === 404) return [];

    if (r.ok && r.data && !Array.isArray(r.data))
      return [normalizeCompany(r.data)];
    if (r.ok && Array.isArray(r.data))
      return (r.data as any[]).map(normalizeCompany);

    if (!r.ok)
      lastErr = new Error(
        `GET ${url} failed (${r.status}): ${r.text || "unknown"}`
      );
  }

  throw lastErr ?? new Error("Failed to load companies");
}

async function createCompany(payloadBase: {
  name: string;
  city?: string;
  site?: string;
  description?: string;
  typeValue: string;
}): Promise<{ id: string; raw: any }> {
  const base = {
    name: payloadBase.name,
    city: payloadBase.city,
    site: payloadBase.site,
    description: payloadBase.description,
    type: { value: payloadBase.typeValue },
  };

  const urls = [
    `/api/v1/company`,
    `/api/v1/company/create`,
    `/api/v1/companies`,
    `/api/v1/companies/create`,
  ];

  const bodies = [base, { request: base }];

  let lastErr: any = null;

  for (const url of urls) {
    for (const body of bodies) {
      const r = await authFetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        lastErr = new Error(
          `POST ${url} failed (${r.status}): ${r.text || "unknown"}`
        );
        continue;
      }

      const id = pickCompanyId(r.data) ?? pickCompanyId(r);
      if (!id) {
        lastErr = new Error(
          `POST ${url} succeeded but no company id returned`
        );
        continue;
      }

      return { id, raw: r.data };
    }
  }

  throw lastErr ?? new Error("Failed to create company");
}

async function uploadCompanyFile(opts: {
  companyId: string;
  kind: "logo" | "document";
  file: File;
}): Promise<void> {
  const token = localStorage.getItem("token") || "";

  const fd = new FormData();
  fd.append(opts.kind, opts.file);

  const pathKind = opts.kind === "document" ? "documents" : "logo";

  const resp = await fetch(
    `/api/v1/company/${opts.companyId}/files/${pathKind}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    }
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `Upload ${opts.kind} failed (${resp.status}): ${text || "unknown"}`
    );
  }
}

const pickVacancyId = (data: any): string | null => {
  const d = data?.vacancy ?? data?.data ?? data?.result ?? data;
  const id = d?.id ?? d?.vacancy_id ?? d?.uuid;
  return id ? String(id) : null;
};

async function createVacancy(payload: {
  title: string;
  salary?: number;
  schedule?: string;
  work_format?: string;
  experience?: number;
  position_status?: string;
  company_id: string;
}): Promise<{ id: string; raw: any }> {
  const url = `/api/v1/hr/vacancy`;
  const bodies = [payload, { request: payload }];

  let lastErr: any = null;

  for (const body of bodies) {
    const r = await authFetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      lastErr = new Error(
        `POST ${url} failed (${r.status}): ${r.text || "unknown"}`
      );
      continue;
    }

    const id = pickVacancyId(r.data) ?? pickVacancyId(r);
    if (!id) {
      lastErr = new Error(`POST ${url} succeeded but no vacancy id returned`);
      continue;
    }

    return { id, raw: r.data };
  }

  throw lastErr ?? new Error("Failed to create vacancy");
}

async function uploadVacancyAttachment(opts: {
  vacancyId: string;
  file: File;
}): Promise<void> {
  const token = localStorage.getItem("token") || "";
  const fd = new FormData();
  fd.append("attachment", opts.file);

  const urls = [
    `/api/v1/hr/vacancy/${opts.vacancyId}/files/attachment`,
    `/api/v1/vacancy/${opts.vacancyId}/files/attachment`,
    `/api/v1/vacancies/${opts.vacancyId}/files/attachment`,
  ];

  let last: any = null;

  for (const url of urls) {
    const resp = await fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });

    if (resp.ok) return;
    last = { status: resp.status, text: await resp.text().catch(() => "") };
  }

  throw new Error(
    `Upload attachment failed (${last?.status}): ${last?.text || "unknown"}`
  );
}

async function fetchMyVacancies(params?: {
  page?: number;
  limit?: number;
  company_id?: string;
  position_status?: string;
  work_format?: string;
  schedule?: string;
  min_salary?: number;
  max_salary?: number;
  min_experience?: number;
  max_experience?: number;
  search_title?: string;
}): Promise<VacancyItem[]> {
  const q = new URLSearchParams();

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;

  q.set("page", String(page));
  q.set("limit", String(limit));

  const add = (k: string, v: any) => {
    if (v === null || v === undefined || v === "") return;
    q.set(k, String(v));
  };

  add("company_id", params?.company_id);
  add("position_status", params?.position_status);
  add("work_format", params?.work_format);
  add("schedule", params?.schedule);
  add("min_salary", params?.min_salary);
  add("max_salary", params?.max_salary);
  add("min_experience", params?.min_experience);
  add("max_experience", params?.max_experience);
  add("search_title", params?.search_title);

  const url = `/api/v1/hr/vacancy?${q.toString()}`;
  const r = await authFetchJson(url, { method: "GET" });

  if (!r.ok) {
    if (r.status === 404) return [];
    throw new Error(
      `GET /hr/vacancy failed (${r.status}): ${r.text || "unknown"}`
    );
  }

  const list =
    (r.data as any)?.vacancies ?? (r.data as any)?.data?.vacancies ?? [];
  if (!Array.isArray(list)) return [];

  return list.map(normalizeVacancy);
}

async function patchVacancySwagger(
  id: string,
  requestBody: any
): Promise<VacancyItem | null> {
  const url = `/api/v1/hr/vacancy/${id}`;
  const candidates = [requestBody, { request: requestBody }];

  let lastErr: any = null;

  for (const bodyObj of candidates) {
    const r = await authFetchJson(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });

    if (r.ok) {
      const payload: any = r.data ?? {};
      const v = payload?.vacancy ?? payload?.data ?? payload;
      if (v && typeof v === "object") return normalizeVacancy(v);
      return null;
    }

    lastErr = new Error(
      `PATCH ${url} failed (${r.status}): ${r.text || "unknown"}`
    );
  }

  throw lastErr ?? new Error("Failed to patch vacancy");
}

async function deleteVacancy(id: string): Promise<void> {
  const urls = [
    `/api/v1/hr/vacancy/${id}`,
    `/api/v1/vacancy/${id}`,
    `/api/v1/vacancies/${id}`,
  ];

  let lastErr: any = null;

  for (const url of urls) {
    const r = await authFetchJson(url, { method: "DELETE" });
    if (r.ok) return;
    if (r.status === 404) continue;
    lastErr = new Error(
      `DELETE ${url} failed (${r.status}): ${r.text || "unknown"}`
    );
  }

  throw lastErr ?? new Error("Failed to delete vacancy");
}

export default function ProfileHRFull() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string>("");

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showVacancyModal, setShowVacancyModal] = useState(false);

  const [showVacancyViewModal, setShowVacancyViewModal] = useState(false);

  const [showVacancyEditModal, setShowVacancyEditModal] = useState(false);

  const [selectedVacancy, setSelectedVacancy] = useState<VacancyItem | null>(
    null
  );

  const [vacancyEditForm, setVacancyEditForm] = useState({
    id: "",
    title: "",
    salary: "",
    schedule: "",
    work_format: "",
    experience: "",
    position_status: "",
    company_id: "",
    create_at: "",
    attachment_id: "",
    attachment_url: "",
  });

  const [vacancyEditFile, setVacancyEditFile] = useState<File | null>(null);
  const [vacancyEditSaving, setVacancyEditSaving] = useState(false);
  const [vacancyEditErr, setVacancyEditErr] = useState("");
  const [vacancyEditMsg, setVacancyEditMsg] = useState("");

  const [companyForm, setCompanyForm] = useState({
    name: "",
    city: "",
    site: "",
    typeValue: "",
    description: "",
  });
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyDoc, setCompanyDoc] = useState<File | null>(null);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMsg, setCompanyMsg] = useState<string>("");
  const [companyErr, setCompanyErr] = useState<string>("");

  const [vacancyForm, setVacancyForm] = useState({
    title: "",
    salary: "",
    schedule: "",
    work_format: "",
    experience: "",
    position_status: "",
  });
  const [vacancyFile, setVacancyFile] = useState<File | null>(null);
  const [vacancySaving, setVacancySaving] = useState(false);
  const [vacancyMsg, setVacancyMsg] = useState("");
  const [vacancyErr, setVacancyErr] = useState("");

  const [createdVacancies, setCreatedVacancies] = useState<VacancyItem[]>([]);
  const [vacanciesLoading, setVacanciesLoading] = useState(false);
  const [vacanciesError, setVacanciesError] = useState("");

  const [vacancyCompanyId, setVacancyCompanyId] = useState<string>("");

  useEffect(() => {
    if (!vacancyCompanyId && companies.length > 0) {
      setVacancyCompanyId(String(companies[0].id ?? ""));
    }
  }, [companies, vacancyCompanyId]);

  const resetCompanyForm = () => {
    setCompanyForm({
      name: "",
      city: "",
      site: "",
      typeValue: "",
      description: "",
    });
    setCompanyLogo(null);
    setCompanyDoc(null);
    setCompanyMsg("");
    setCompanyErr("");
    setCompanySaving(false);
  };

  const resetVacancyForm = () => {
    setVacancyForm({
      title: "",
      salary: "",
      schedule: "",
      work_format: "",
      experience: "",
      position_status: "",
    });
    setVacancyFile(null);
    setVacancyMsg("");
    setVacancyErr("");
    setVacancySaving(false);
  };

  const openCompanyModal = () => {
    resetCompanyForm();
    setShowCompanyModal(true);
  };
  const closeCompanyModal = () => setShowCompanyModal(false);

  const openVacancyModal = () => {
    resetVacancyForm();
    setShowVacancyModal(true);
  };
  const closeVacancyModal = () => setShowVacancyModal(false);

  const closeVacancyViewModal = () => setShowVacancyViewModal(false);

  const closeVacancyEditModal = () => {
    setShowVacancyEditModal(false);
    setVacancyEditFile(null);
    setVacancyEditErr("");
    setVacancyEditMsg("");
  };

  const openVacancyView = (vac: VacancyItem) => {
    const nv = normalizeVacancy(vac);
    setSelectedVacancy(nv);
    setShowVacancyViewModal(true);
  };

  const openVacancyEdit = () => {
    if (!selectedVacancy) return;

    const v = normalizeVacancy(selectedVacancy);

    setVacancyEditForm({
      id: v.id || "",
      title: v.title || "",
      salary: v.salary !== undefined ? String(v.salary) : "",
      schedule: v.schedule || "",
      work_format: v.work_format || "",
      experience: v.experience !== undefined ? String(v.experience) : "",
      position_status: v.position_status || "",
      company_id: v.company_id || "",
      create_at: v.create_at || "",
      attachment_id: v.attachment_id || "",
      attachment_url: v.attachment_url || "",
    });

    setVacancyEditFile(null);
    setVacancyEditErr("");
    setVacancyEditMsg("");

    setShowVacancyViewModal(false);
    setShowVacancyEditModal(true);
  };

  const isAvatar = (it: AchievementItem) =>
    [it.id, it.name, it.file_name].some((v) => hasAvatarPrefix(v));

  const reloadCompanies = async () => {
    try {
      setCompaniesError("");
      setCompaniesLoading(true);
      const list = await fetchCompaniesStrict();
      setCompanies(list);
    } catch (e: any) {
      console.error("Не удалось загрузить компании:", e);
      setCompanies([]);
      setCompaniesError(
        e?.message || "Не удалось загрузить компании. Попробуйте позже."
      );
    } finally {
      setCompaniesLoading(false);
    }
  };

  const reloadVacancies = async () => {
    try {
      setVacanciesError("");
      setVacanciesLoading(true);

      const remote = await fetchMyVacancies({ page: 1, limit: 100 });
      setCreatedVacancies(remote);

      if (selectedVacancy?.id) {
        const updated = remote.find(
          (x) => String(x.id) === String(selectedVacancy.id)
        );
        if (updated) setSelectedVacancy(normalizeVacancy(updated));
      }
    } catch (e: any) {
      console.error("Не удалось загрузить вакансии:", e);
      setVacanciesError(e?.message || "Не удалось загрузить вакансии.");
      setCreatedVacancies([]);
    } finally {
      setVacanciesLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    const role = (localStorage.getItem("role") || "").trim();

    const isHr =
      role === "ROLE_EMPLOYER" || role === "ROLE_COMPANY" || role === "hr";

    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!isHr) {
      navigate("/profile", { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);

        setCreatedVacancies([]);
        setVacanciesError("");

        const resp = await apiGateway({
          method: "GET",
          url: "/users/me",
        });

        const data: UserProfile = unwrap(resp);
        setProfile(data);

        try {
          const list = await AchievementsAPI.list();
          const avatarItem = list.find(isAvatar);

          if (avatarItem?.url) setAvatarUrl(avatarItem.url);
          else if (data?.avatar_url) setAvatarUrl(data.avatar_url);
          else setAvatarUrl(null);
        } catch (err) {
          console.warn("Не удалось получить аватар из achievements:", err);
          setAvatarUrl(data?.avatar_url || null);
        }

        await reloadVacancies();
      } catch (e) {
        console.error("Не удалось загрузить профиль HR:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/auth", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    reloadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/auth", { replace: true });
  };

  const p = profile || {};
  const fullName =
    [p.last_name, p.first_name].filter(Boolean).join(" ") || "Профиль HR";

  const hasDescription = !!p.description && p.description.trim().length > 0;

  const tgRaw = (p.telegram || p.tg || "").trim();
  const tgShown = tgRaw ? (tgRaw.startsWith("@") ? tgRaw : `@${tgRaw}`) : "";
  const tgHandle = tgRaw ? tgRaw.replace("@", "") : "";

  const companiesCards = useMemo(() => {
    return companies.map((c, idx) => {
      const pack = decorPack[idx % decorPack.length];
      const title = c.name || "Компания";
      const subtitle = [c.city, c.type?.value].filter(Boolean).join(" • ");
      const site = (c.site || "").trim();

      return {
        id: c.id || `comp-${idx}`,
        title,
        subtitle,
        site,
        color: pack.color,
        decor: pack.decor,
        logo: c.logo_url || "",
      };
    });
  }, [companies]);

  const onCompanyField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
  };

  const onVacancyField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVacancyForm((prev) => ({ ...prev, [name]: value }));
  };

  const onVacancyEditField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVacancyEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateCompanyFiles = (): string | null => {
    if (companyLogo) {
      const okTypes = ["image/png", "image/jpeg", "image/svg+xml"];
      if (!okTypes.includes(companyLogo.type))
        return "Логотип: поддерживаются JPG, PNG, SVG.";
      if (companyLogo.size > 5 * 1024 * 1024)
        return "Логотип: максимальный размер 5MB.";
    }
    if (companyDoc) {
      if (companyDoc.size > 20 * 1024 * 1024)
        return "Документ: максимальный размер 20MB.";
    }
    return null;
  };

  const validateVacancyFile = (f: File | null): string | null => {
    if (!f) return null;
    if (f.size > 10 * 1024 * 1024) return "Вложение: максимальный размер 10MB.";
    return null;
  };

  const parseNumOrUndefined = (s: string): number | undefined => {
    const t = (s ?? "").trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    setCompanyErr("");
    setCompanyMsg("");

    const name = companyForm.name.trim();
    const typeValue = companyForm.typeValue.trim();
    const city = companyForm.city.trim();
    const site = companyForm.site.trim();
    const description = companyForm.description.trim();

    if (!name) {
      setCompanyErr("Название компании — обязательное поле.");
      return;
    }
    if (!typeValue) {
      setCompanyErr("Тип компании (type.value) — обязательное поле.");
      return;
    }

    const fileErr = validateCompanyFiles();
    if (fileErr) {
      setCompanyErr(fileErr);
      return;
    }

    try {
      setCompanySaving(true);

      const { id } = await createCompany({
        name,
        city: city || undefined,
        site: site || undefined,
        description: description || undefined,
        typeValue,
      });

      if (companyLogo)
        await uploadCompanyFile({ companyId: id, kind: "logo", file: companyLogo });
      if (companyDoc)
        await uploadCompanyFile({ companyId: id, kind: "document", file: companyDoc });

      setCompanyMsg("Компания создана!");
      await reloadCompanies();

      setTimeout(() => setShowCompanyModal(false), 400);
    } catch (err: any) {
      console.error("CREATE COMPANY ERROR:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Не удалось создать компанию. Попробуйте позже.";
      setCompanyErr(msg);
    } finally {
      setCompanySaving(false);
    }
  };

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();

    setVacancyErr("");
    setVacancyMsg("");

    const title = vacancyForm.title.trim();
    if (!title) {
      setVacancyErr("Название вакансии — обязательное поле.");
      return;
    }

    const companyId = (vacancyCompanyId || "").trim();
    if (!companyId) {
      setVacancyErr("Выбери компанию (company_id должен быть из БД).");
      return;
    }

    const fileErr = validateVacancyFile(vacancyFile);
    if (fileErr) {
      setVacancyErr(fileErr);
      return;
    }

    const salaryNum = parseNumOrUndefined(vacancyForm.salary);
    const expNum = parseNumOrUndefined(vacancyForm.experience);

    if (vacancyForm.salary.trim() && salaryNum === undefined) {
      setVacancyErr("Зарплата должна быть числом.");
      return;
    }
    if (vacancyForm.experience.trim() && expNum === undefined) {
      setVacancyErr("Опыт должен быть числом.");
      return;
    }

    try {
      setVacancySaving(true);

      const payload = {
        title,
        salary: salaryNum,
        schedule: vacancyForm.schedule.trim() || undefined,
        work_format: vacancyForm.work_format.trim() || undefined,
        experience: expNum,
        position_status: vacancyForm.position_status.trim() || undefined,
        company_id: companyId,
      };

      const { id } = await createVacancy(payload);

      if (vacancyFile) {
        await uploadVacancyAttachment({ vacancyId: id, file: vacancyFile });
      }

      await reloadVacancies();

      setVacancyMsg("Вакансия создана!");
      setTimeout(() => setShowVacancyModal(false), 400);
    } catch (err: any) {
      console.error("CREATE VACANCY ERROR:", err);
      setVacancyErr(err?.message || "Не удалось создать вакансию.");
    } finally {
      setVacancySaving(false);
    }
  };

  const handleSaveVacancyEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    setVacancyEditErr("");
    setVacancyEditMsg("");

    const vacId = vacancyEditForm.id.trim();
    if (!vacId) {
      setVacancyEditErr("Не удалось определить ID вакансии.");
      return;
    }

    const title = vacancyEditForm.title.trim();
    if (!title) {
      setVacancyEditErr("Название вакансии — обязательное поле.");
      return;
    }

    const fileErr = validateVacancyFile(vacancyEditFile);
    if (fileErr) {
      setVacancyEditErr(fileErr);
      return;
    }

    const salaryNum = parseNumOrUndefined(vacancyEditForm.salary);
    const expNum = parseNumOrUndefined(vacancyEditForm.experience);

    if (vacancyEditForm.salary.trim() && salaryNum === undefined) {
      setVacancyEditErr("Зарплата должна быть числом.");
      return;
    }
    if (vacancyEditForm.experience.trim() && expNum === undefined) {
      setVacancyEditErr("Опыт должен быть числом.");
      return;
    }

    const companyIdFromDb = (
      selectedVacancy?.company_id ||
      vacancyEditForm.company_id ||
      ""
    ).trim();
    if (!companyIdFromDb) {
      setVacancyEditErr(
        "company_id отсутствует. Нельзя обновить (должен приходить из БД)."
      );
      return;
    }

    try {
      setVacancyEditSaving(true);

      const current = normalizeVacancy(selectedVacancy || {});

      const requestBody = {
        id: vacId,
        title,

        salary:
          salaryNum !== undefined
            ? salaryNum
            : current.salary !== undefined
            ? current.salary
            : 0,

        schedule:
          vacancyEditForm.schedule.trim() !== ""
            ? vacancyEditForm.schedule.trim()
            : current.schedule || "",

        work_format:
          vacancyEditForm.work_format.trim() !== ""
            ? vacancyEditForm.work_format.trim()
            : current.work_format || "",

        experience:
          expNum !== undefined
            ? expNum
            : current.experience !== undefined
            ? current.experience
            : 0,

        position_status:
          vacancyEditForm.position_status.trim() !== ""
            ? vacancyEditForm.position_status.trim()
            : current.position_status || "",

        company_id: companyIdFromDb,

        create_at: current.create_at || vacancyEditForm.create_at || "",
        attachment_id: current.attachment_id || vacancyEditForm.attachment_id || "",
        attachment_url: current.attachment_url || vacancyEditForm.attachment_url || "",
      };

      await patchVacancySwagger(vacId, requestBody);

      if (vacancyEditFile) {
        await uploadVacancyAttachment({ vacancyId: vacId, file: vacancyEditFile });
      }

      await reloadVacancies();

      const refreshed = await fetchMyVacancies({ page: 1, limit: 100 });
      const updatedFromDb = refreshed.find((x) => String(x.id) === String(vacId));
      if (updatedFromDb) setSelectedVacancy(normalizeVacancy(updatedFromDb));

      setVacancyEditMsg("Сохранено!");
      setTimeout(() => setShowVacancyEditModal(false), 250);
    } catch (err: any) {
      console.error("PATCH VACANCY ERROR:", err);
      setVacancyEditErr(err?.message || "Не удалось обновить вакансию.");
    } finally {
      setVacancyEditSaving(false);
    }
  };

  const handleDeleteVacancy = async () => {
    setVacancyEditErr("");
    setVacancyEditMsg("");

    const id = selectedVacancy?.id ? String(selectedVacancy.id) : "";
    if (!id) {
      setVacancyEditErr("Не удалось определить ID вакансии.");
      return;
    }

    try {
      setVacancyEditSaving(true);
      await deleteVacancy(id);
      await reloadVacancies();

      setShowVacancyEditModal(false);
      setShowVacancyViewModal(false);
      setSelectedVacancy(null);
    } catch (err: any) {
      console.error("DELETE VACANCY ERROR:", err);
      setVacancyEditErr(err?.message || "Не удалось удалить вакансию.");
    } finally {
      setVacancyEditSaving(false);
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-section">
        <div className="profile-card">
          <div className="profile-photo">
            <img src={avatarUrl || avatarFallback} alt="Фото HR" />
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{loading ? "Загрузка..." : fullName}</h2>

            <ul className="profile-details-list">
              <li>Возраст: {typeof p.age === "number" ? `${p.age} лет` : "—"}</li>
              <li>Профиль: {p.profession_category || p.specialization || "—"}</li>
            </ul>

            <div className="profile-contacts">
              <strong>Контакты:</strong>
              <ul className="profile-contacts-list">
                <li>Email: {p.email ? p.email : "не указан"}</li>
                <li>
                  Telegram:{" "}
                  {tgRaw ? (
                    <a
                      href={`https://t.me/${tgHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tgShown}
                    </a>
                  ) : (
                    "не указан"
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="profile-bottom-block">
          <div className="profile-about">
            <h2 className="profile-about-title">О себе:</h2>
            <p>{hasDescription ? p.description : "Пользователь пока не заполнил описание для профиля."}</p>
          </div>
        </div>

        <div className="profile-buttons">
          <button className="profile-btn" onClick={openVacancyModal}>
            Добавить вакансию
          </button>

          <button className="profile-btn" onClick={openCompanyModal}>
            Добавить компанию
          </button>

          <button className="profile-btn" onClick={() => navigate("/hr-profile/edit")}>
            Редактировать информацию
          </button>

          <button onClick={handleLogout} className="profile-btn logout-btn">
            Выйти из аккаунта
          </button>
        </div>

        <div className="hr-section">
          <h3>Список доступных вакансий, оставленных пользователем:</h3>

          {vacanciesLoading ? (
            <p style={{ marginTop: 12 }}>Загрузка вакансий...</p>
          ) : vacanciesError ? (
            <p style={{ marginTop: 12, color: "#d00" }}>{vacanciesError}</p>
          ) : createdVacancies.length === 0 ? (
            <p style={{ marginTop: 12 }}>
              Пока нет вакансий. Создай первую вакансию — и она появится здесь.
            </p>
          ) : (
            <div style={{ marginTop: 18, overflow: "hidden" }}>
              <div
                className="hr-carousel__track"
                role="region"
                aria-label="Вакансии"
              >
                {createdVacancies.map((vac: any, idx: number) => {
                  const pack = decorPack[idx % decorPack.length];
                  const v = normalizeVacancy(vac);
                  const title = v.title || "Вакансия";

                  const subtitle = [
                    v.salary ? `${v.salary} ₽` : "",
                    v.schedule || "",
                    v.work_format || "",
                    typeof v.experience === "number" ? `Опыт: ${v.experience}` : "",
                    v.position_status || "",
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <article
                      key={v.id || `vac-${idx}`}
                      className={`hr-card hr-card--${pack.color} hr-carousel__item`}
                      style={{ cursor: "pointer" }}
                      onClick={() => openVacancyView(v)}
                      title="Открыть"
                    >
                      <div className="hr-card-decor">
                        <img src={pack.decor} alt="" />
                      </div>
                      <h3>{title}</h3>
                      {subtitle ? (
                        <p style={{ marginTop: 6, opacity: 0.9 }}>{subtitle}</p>
                      ) : null}
                      <span className="hr-card-link">Посмотреть</span>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="hr-section">
          <h3>Компании, в которых числится HR:</h3>

          {companiesLoading && (
            <div className="hr-cards">
              <article className="hr-card hr-card--green">
                <div className="hr-card-decor">
                  <img src={spiral} alt="" />
                </div>
                <h3>Загрузка...</h3>
                <span className="hr-card-link">Пожалуйста, подождите</span>
              </article>
            </div>
          )}

          {!companiesLoading && companiesError && (
            <p style={{ color: "#d00", marginTop: 12 }}>{companiesError}</p>
          )}

          {!companiesLoading && !companiesError && companiesCards.length === 0 && (
            <p style={{ marginTop: 12 }}>Пока нет компаний.</p>
          )}

          {!companiesLoading && !companiesError && companiesCards.length > 0 && (
            <div className="hr-cards">
              {companiesCards.map((comp) => (
                <article key={comp.id} className={`hr-card hr-card--${comp.color}`}>
                  <div className="hr-card-decor">
                    <img src={comp.decor} alt="" />
                  </div>

                  {comp.logo ? (
                    <div style={{ marginBottom: 10 }}>
                      <img
                        src={comp.logo}
                        alt=""
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 12,
                          objectFit: "cover",
                          border: "1px solid rgba(0,0,0,0.08)",
                          background: "#fff",
                        }}
                      />
                    </div>
                  ) : null}

                  <h3>{comp.title}</h3>

                  {comp.subtitle ? (
                    <p style={{ marginTop: 6, opacity: 0.9 }}>{comp.subtitle}</p>
                  ) : null}

                  {comp.site ? (
                    <a
                      href={comp.site.startsWith("http") ? comp.site : `https://${comp.site}`}
                      className="hr-card-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Сайт
                    </a>
                  ) : (
                    <span className="hr-card-link">Посмотреть</span>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        {showVacancyViewModal && selectedVacancy && (
          <div className="mj-modal-backdrop" onClick={closeVacancyViewModal}>
            <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mj-modal-header">
                <div>
                  <h2 className="mj-modal-title">Вакансия</h2>
                  <p className="mj-modal-subtitle">Информация</p>
                </div>
                <button className="mj-btn mj-btn--ghost" type="button" onClick={closeVacancyViewModal}>
                  Закрыть
                </button>
              </div>

              <div className="mj-grid">
                <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                  <div className="mj-label">Название</div>
                  <div className="mj-readbox">{selectedVacancy.title || "—"}</div>
                </div>

                <div className="mj-field">
                  <div className="mj-label">Зарплата</div>
                  <div className="mj-readbox">{selectedVacancy.salary ?? "—"}</div>
                </div>

                <div className="mj-field">
                  <div className="mj-label">График</div>
                  <div className="mj-readbox">{selectedVacancy.schedule || "—"}</div>
                </div>

                <div className="mj-field">
                  <div className="mj-label">Формат работы</div>
                  <div className="mj-readbox">{selectedVacancy.work_format || "—"}</div>
                </div>

                <div className="mj-field">
                  <div className="mj-label">Опыт</div>
                  <div className="mj-readbox">{selectedVacancy.experience ?? "—"}</div>
                </div>

                <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                  <div className="mj-label">Статус</div>
                  <div className="mj-readbox">{selectedVacancy.position_status || "—"}</div>
                </div>

                <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                  <div className="mj-label">Вложение</div>
                  <div className="mj-readbox">
                    {selectedVacancy.attachment_url ? (
                      <a className="mj-link" href={selectedVacancy.attachment_url} target="_blank" rel="noopener noreferrer">
                        открыть файл
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>

              <div className="mj-actions">
                <button className="mj-btn mj-btn--primary" type="button" onClick={openVacancyEdit}>
                  Редактировать
                </button>

                <button
                  className="mj-btn mj-btn--danger"
                  type="button"
                  onClick={handleDeleteVacancy}
                  disabled={vacancyEditSaving}
                  style={{ opacity: vacancyEditSaving ? 0.7 : 1 }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {showVacancyEditModal && selectedVacancy && (
          <div className="mj-modal-backdrop" onClick={closeVacancyEditModal}>
            <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mj-modal-header">
                <div>
                  <h2 className="mj-modal-title">Редактирование вакансии</h2>
                  <p className="mj-modal-subtitle"></p>
                </div>
                <button className="mj-btn mj-btn--ghost" type="button" onClick={closeVacancyEditModal}>
                  Закрыть
                </button>
              </div>

              <form onSubmit={handleSaveVacancyEdit}>
                <div className="mj-grid">
                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">
                      Название <span style={{ color: "#d00" }}>*</span>
                    </label>
                    <input
                      className="mj-input"
                      name="title"
                      value={vacancyEditForm.title}
                      onChange={onVacancyEditField}
                      placeholder="Например: Frontend Developer"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Зарплата</label>
                    <input
                      className="mj-input"
                      name="salary"
                      value={vacancyEditForm.salary}
                      onChange={onVacancyEditField}
                      placeholder="50000"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">График</label>
                    <input
                      className="mj-input"
                      name="schedule"
                      value={vacancyEditForm.schedule}
                      onChange={onVacancyEditField}
                      placeholder="5/2"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Формат работы</label>
                    <input
                      className="mj-input"
                      name="work_format"
                      value={vacancyEditForm.work_format}
                      onChange={onVacancyEditField}
                      placeholder="Удалёнка / Офис / Гибрид"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Опыт</label>
                    <input
                      className="mj-input"
                      name="experience"
                      value={vacancyEditForm.experience}
                      onChange={onVacancyEditField}
                      placeholder="1"
                    />
                  </div>

                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">Статус</label>
                    <input
                      className="mj-input"
                      name="position_status"
                      value={vacancyEditForm.position_status}
                      onChange={onVacancyEditField}
                      placeholder="open"
                    />
                  </div>

                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">Вложение (attachment, до 10MB)</label>
                    <input
                      className="mj-file"
                      type="file"
                      onChange={(e) => setVacancyEditFile(e.target.files?.[0] ?? null)}
                    />
                    {selectedVacancy.attachment_url ? (
                      <div className="mj-note">
                        Текущее вложение:{" "}
                        <a className="mj-link" href={selectedVacancy.attachment_url} target="_blank" rel="noopener noreferrer">
                          открыть
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                <input type="hidden" name="company_id" value={vacancyEditForm.company_id} readOnly />
                <input type="hidden" name="id" value={vacancyEditForm.id} readOnly />
                <input type="hidden" name="create_at" value={vacancyEditForm.create_at} readOnly />
                <input type="hidden" name="attachment_id" value={vacancyEditForm.attachment_id} readOnly />
                <input type="hidden" name="attachment_url" value={vacancyEditForm.attachment_url} readOnly />

                {vacancyEditErr ? <div className="mj-alert mj-alert--err">{vacancyEditErr}</div> : null}
                {vacancyEditMsg ? <div className="mj-alert mj-alert--ok">{vacancyEditMsg}</div> : null}

                <div className="mj-actions">
                  <button
                    className="mj-btn mj-btn--primary"
                    type="submit"
                    disabled={vacancyEditSaving}
                    style={{ opacity: vacancyEditSaving ? 0.7 : 1 }}
                  >
                    {vacancyEditSaving ? "Сохраняем..." : "Сохранить"}
                  </button>

                  <button
                    className="mj-btn mj-btn--ghost"
                    type="button"
                    onClick={closeVacancyEditModal}
                    disabled={vacancyEditSaving}
                    style={{ opacity: vacancyEditSaving ? 0.7 : 1 }}
                  >
                    Отмена
                  </button>

                  <button
                    className="mj-btn mj-btn--danger"
                    type="button"
                    onClick={handleDeleteVacancy}
                    disabled={vacancyEditSaving}
                    style={{ opacity: vacancyEditSaving ? 0.7 : 1 }}
                  >
                    Удалить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCompanyModal && (
          <div className="mj-modal-backdrop" onClick={closeCompanyModal}>
            <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mj-modal-header">
                <div>
                  <h2 className="mj-modal-title">Создание компании</h2>
                  <p className="mj-modal-subtitle">Сначала компания, потом вакансия — чтобы company_id был из БД</p>
                </div>
                <button className="mj-btn mj-btn--ghost" type="button" onClick={closeCompanyModal}>
                  Закрыть
                </button>
              </div>

              <form onSubmit={handleCreateCompany}>
                <div className="mj-grid">
                  <div className="mj-field">
                    <label className="mj-label">
                      Название <span style={{ color: "#d00" }}>*</span>
                    </label>
                    <input
                      className="mj-input"
                      name="name"
                      value={companyForm.name}
                      onChange={onCompanyField}
                      placeholder="Например: МосковПолитех"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">
                      Тип (type.value) <span style={{ color: "#d00" }}>*</span>
                    </label>
                    <input
                      className="mj-input"
                      name="typeValue"
                      value={companyForm.typeValue}
                      onChange={onCompanyField}
                      placeholder="Например: IT / education / studio"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Город</label>
                    <input
                      className="mj-input"
                      name="city"
                      value={companyForm.city}
                      onChange={onCompanyField}
                      placeholder="Москва"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Сайт</label>
                    <input
                      className="mj-input"
                      name="site"
                      value={companyForm.site}
                      onChange={onCompanyField}
                      placeholder="example.com или https://example.com"
                    />
                  </div>

                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">Описание</label>
                    <textarea
                      name="description"
                      value={companyForm.description}
                      onChange={onCompanyField}
                      placeholder="Коротко о компании…"
                      style={{ width: "100%", minHeight: 120 }}
                      className="mj-input"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Логотип (JPG/PNG/SVG, до 5MB)</label>
                    <input
                      className="mj-file"
                      type="file"
                      accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
                      onChange={(e) => setCompanyLogo(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Документ (до 20MB)</label>
                    <input
                      className="mj-file"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(e) => setCompanyDoc(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                {companyErr ? <div className="mj-alert mj-alert--err">{companyErr}</div> : null}
                {companyMsg ? <div className="mj-alert mj-alert--ok">{companyMsg}</div> : null}

                <div className="mj-actions">
                  <button
                    className="mj-btn mj-btn--primary"
                    type="submit"
                    disabled={companySaving}
                    style={{ opacity: companySaving ? 0.7 : 1 }}
                  >
                    {companySaving ? "Создаём..." : "Создать компанию"}
                  </button>

                  <button
                    className="mj-btn mj-btn--ghost"
                    type="button"
                    onClick={closeCompanyModal}
                    disabled={companySaving}
                    style={{ opacity: companySaving ? 0.7 : 1 }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showVacancyModal && (
          <div className="mj-modal-backdrop" onClick={closeVacancyModal}>
            <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mj-modal-header">
                <div>
                  <h2 className="mj-modal-title">Создание вакансии</h2>
                  <p className="mj-modal-subtitle">company_id обязателен и должен быть из БД</p>
                </div>
                <button className="mj-btn mj-btn--ghost" type="button" onClick={closeVacancyModal}>
                  Закрыть
                </button>
              </div>

              <form onSubmit={handleCreateVacancy}>
                <div className="mj-field" style={{ marginBottom: 14 }}>
                  <label className="mj-label">
                    Компания <span style={{ color: "#d00" }}>*</span>
                  </label>
                  <select
                    className="mj-input"
                    value={vacancyCompanyId}
                    onChange={(e) => setVacancyCompanyId(e.target.value)}
                  >
                    <option value="">— выбрать —</option>
                    {companies.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>

                  {companies.length === 0 ? (
                    <div className="mj-note">
                      Нет компаний — сначала создай компанию, потом вакансию (company_id должен быть из БД).
                    </div>
                  ) : null}
                </div>

                <div className="mj-grid">
                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">
                      Название <span style={{ color: "#d00" }}>*</span>
                    </label>
                    <input
                      className="mj-input"
                      name="title"
                      value={vacancyForm.title}
                      onChange={onVacancyField}
                      placeholder="Например: Frontend Developer"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Зарплата</label>
                    <input
                      className="mj-input"
                      name="salary"
                      value={vacancyForm.salary}
                      onChange={onVacancyField}
                      placeholder="50000"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">График (schedule)</label>
                    <input
                      className="mj-input"
                      name="schedule"
                      value={vacancyForm.schedule}
                      onChange={onVacancyField}
                      placeholder="5/2"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Формат работы (work_format)</label>
                    <input
                      className="mj-input"
                      name="work_format"
                      value={vacancyForm.work_format}
                      onChange={onVacancyField}
                      placeholder="Удалёнка / Офис / Гибрид"
                    />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Опыт (experience, число)</label>
                    <input
                      className="mj-input"
                      name="experience"
                      value={vacancyForm.experience}
                      onChange={onVacancyField}
                      placeholder="1"
                    />
                  </div>

                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">Статус (position_status)</label>
                    <input
                      className="mj-input"
                      name="position_status"
                      value={vacancyForm.position_status}
                      onChange={onVacancyField}
                      placeholder="open"
                    />
                  </div>

                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">Вложение (attachment, до 10MB)</label>
                    <input
                      className="mj-file"
                      type="file"
                      onChange={(e) => setVacancyFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                {vacancyErr ? <div className="mj-alert mj-alert--err">{vacancyErr}</div> : null}
                {vacancyMsg ? <div className="mj-alert mj-alert--ok">{vacancyMsg}</div> : null}

                <div className="mj-actions">
                  <button
                    className="mj-btn mj-btn--primary"
                    type="submit"
                    disabled={vacancySaving}
                    style={{ opacity: vacancySaving ? 0.7 : 1 }}
                  >
                    {vacancySaving ? "Создаём..." : "Создать вакансию"}
                  </button>

                  <button
                    className="mj-btn mj-btn--ghost"
                    type="button"
                    onClick={closeVacancyModal}
                    disabled={vacancySaving}
                    style={{ opacity: vacancySaving ? 0.7 : 1 }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
