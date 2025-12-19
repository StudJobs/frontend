// src/pages/ProfileHRFull.tsx
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
  id?: string;
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

type CompanyType = { value?: string };

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
  attachment_url?: string;
  attachment_name?: string;
};

type LocalCompanyStorage = {
  logo?: { dataUrl?: string };
};

type VacancyBindings = Record<string, { company_id: string; created_at?: string }>;
type VacancyAttachments = Record<string, { url: string; name?: string; updated_at?: string }>;

const unwrap = (resp: any) => resp?.data ?? resp ?? {};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const isStr = (v: any) => typeof v === "string" && v.trim().length > 0;

const AVATAR_PREFIX = "user_avatar_";
const isAvatar = (it: AchievementItem) =>
  [it?.id, it?.name, it?.file_name].some((v) => String(v || "").startsWith(AVATAR_PREFIX));

const decorPack = [
  { color: "green", decor: spiral },
  { color: "purple", decor: checkLong },
  { color: "red", decor: wave },
];

const getCompanyLogoDataUrl = (companyId?: string | null): string | null => {
  if (!companyId) return null;

  const rawLocal = localStorage.getItem(`company_local_${companyId}`);
  const parsed = safeJsonParse<LocalCompanyStorage>(rawLocal, {});
  const fromLocal = parsed?.logo?.dataUrl;
  if (isStr(fromLocal)) return fromLocal;

  const legacy = localStorage.getItem(`company_logo_${companyId}`);
  return isStr(legacy) ? legacy : null;
};

const hrCompaniesKey = (hrId: string) => `hr_companies_${hrId}`;
const hrVacancyBindingsKey = (hrId: string) => `hr_vacancy_bindings_${hrId}`;
const hrVacancyAttachmentsKey = (hrId: string) => `hr_vacancy_attachments_${hrId}`;
const hrLastCompanyKey = (hrId: string) => `hr_last_company_${hrId}`;

const hrVacancyIdsKey = (hrId: string) => `hr_vacancy_ids_${hrId}`;

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
    experience: typeof v.experience === "number" ? v.experience : toNum(v.experience),
    position_status: v.position_status ?? "",
    company_id: v.company_id ?? "",
    create_at: v.create_at ?? v.created_at ?? v.createdAt ?? "",
    attachment_url: v.attachment_url ?? v.attachmentUrl ?? v.attachment ?? "",
    attachment_name: v.attachment_name ?? v.attachmentName ?? "",
  };
};

const money = (n?: number) => {
  if (typeof n !== "number") return "—";
  try {
    return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  } catch {
    return `${n} ₽`;
  }
};

const pickVacancyId = (payload: any): string | null => {
  const d = payload?.vacancy ?? payload?.data?.vacancy ?? payload?.data ?? payload;
  const id = d?.id ?? d?.vacancy_id ?? d?.uuid;
  return id ? String(id) : null;
};

const pickFileUrl = (payload: any): string | null => {
  const d = payload?.file_info ?? payload?.data?.file_info ?? payload?.data ?? payload;
  const url = d?.url ?? d?.direct_url ?? d?.download_url;
  return url ? String(url) : null;
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

async function fetchCompanyById(companyId: string): Promise<CompanyItem | null> {
  try {
    const resp = await apiGateway({ method: "GET", url: `/company/${companyId}` });
    const data = unwrap(resp);
    if (!data) return null;
    return normalizeCompany(data);
  } catch (e) {
    console.warn("fetchCompanyById failed:", companyId, e);
    return null;
  }
}

async function fetchMyVacancies(): Promise<VacancyItem[]> {
  const url = `/api/v1/hr/vacancy?page=1&limit=100`;
  const r = await authFetchJson(url, { method: "GET" });

  if (!r.ok) {
    if (r.status === 404) return [];
    throw new Error(`GET ${url} failed (${r.status}): ${r.text || "unknown"}`);
  }

  const payload: any = r.data ?? {};
  const list = payload?.vacancies ?? payload?.data?.vacancies ?? payload?.items ?? [];
  if (!Array.isArray(list)) return [];
  return list.map(normalizeVacancy);
}

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
      lastErr = new Error(`POST ${url} failed (${r.status}): ${r.text || "unknown"}`);
      continue;
    }

    const id = pickVacancyId(r.data) ?? pickVacancyId(r);
    if (!id) {
      lastErr = new Error(`POST ${url} ok, но id вакансии не вернулся`);
      continue;
    }

    return { id, raw: r.data };
  }

  throw lastErr ?? new Error("Failed to create vacancy");
}

async function updateVacancy(
  vacancyId: string,
  payload: {
    title?: string;
    salary?: number;
    schedule?: string;
    work_format?: string;
    experience?: number;
    position_status?: string;
    company_id?: string;
  }
): Promise<void> {
  const url = `/api/v1/hr/vacancy/${encodeURIComponent(vacancyId)}`;
  const bodies = [payload, { request: payload }];

  let lastErr: any = null;

  for (const body of bodies) {
    const r = await authFetchJson(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.ok) return;
    lastErr = new Error(`PATCH ${url} failed (${r.status}): ${r.text || "unknown"}`);
  }

  throw lastErr ?? new Error("Failed to update vacancy");
}

async function deleteVacancy(vacancyId: string): Promise<void> {
  const url = `/api/v1/hr/vacancy/${encodeURIComponent(vacancyId)}`;
  const r = await authFetchJson(url, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE ${url} failed (${r.status}): ${r.text || "unknown"}`);
}

async function uploadVacancyAttachment(vacancyId: string, file: File): Promise<{ url: string }> {
  const url = `/api/v1/vacancy/${encodeURIComponent(vacancyId)}/files/attachment`;

  const fd = new FormData();
  fd.append("attachment", file);

  const token = localStorage.getItem("token") || "";
  const resp = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`POST ${url} failed (${resp.status}): ${text || "unknown"}`);
  }

  const contentType = resp.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await resp.json().catch(() => ({})) : {};

  const fileUrl = pickFileUrl(data);
  if (!fileUrl) throw new Error("Файл загружен, но сервер не вернул ссылку (url).");

  return { url: fileUrl };
}

async function deleteVacancyAttachment(vacancyId: string): Promise<void> {
  const url = `/api/v1/vacancy/${encodeURIComponent(vacancyId)}/files/attachment`;
  const r = await authFetchJson(url, { method: "DELETE" });

  if (!r.ok) throw new Error(`DELETE ${url} failed (${r.status}): ${r.text || "unknown"}`);
}

export default function ProfileHRFull() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [hrId, setHrId] = useState<string>("");

  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState("");

  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [vacanciesLoading, setVacanciesLoading] = useState(false);
  const [vacanciesError, setVacanciesError] = useState("");

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);

  const [showVacancyViewModal, setShowVacancyViewModal] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<VacancyItem | null>(null);

  const [isVacEdit, setIsVacEdit] = useState(false);
  const [vacEditForm, setVacEditForm] = useState({
    company_id: "",
    title: "",
    salary: "",
    schedule: "",
    work_format: "",
    experience: "",
    position_status: "",
  });
  const [vacEditSaving, setVacEditSaving] = useState(false);
  const [vacEditErr, setVacEditErr] = useState("");
  const [vacEditMsg, setVacEditMsg] = useState("");

  const [vacAttFile, setVacAttFile] = useState<File | null>(null);
  const [vacAttUploading, setVacAttUploading] = useState(false);
  const [vacAttMsg, setVacAttMsg] = useState("");
  const [vacAttErr, setVacAttErr] = useState("");

  const [showVacancyModal, setShowVacancyModal] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({
    company_id: "",
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

  const parseNumOrUndefined = (s: string): number | undefined => {
    const t = (s ?? "").trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const getBindings = (hid: string): VacancyBindings => {
    if (!hid) return {};
    return safeJsonParse<VacancyBindings>(localStorage.getItem(hrVacancyBindingsKey(hid)), {});
  };

  const saveBinding = (hid: string, vacancyId: string, companyId: string) => {
    if (!hid || !vacancyId || !companyId) return;
    const map = getBindings(hid);
    map[String(vacancyId)] = { company_id: String(companyId), created_at: new Date().toISOString() };
    localStorage.setItem(hrVacancyBindingsKey(hid), JSON.stringify(map));
  };

  const deleteBinding = (hid: string, vacancyId: string) => {
    if (!hid || !vacancyId) return;
    const map = getBindings(hid);
    delete map[String(vacancyId)];
    localStorage.setItem(hrVacancyBindingsKey(hid), JSON.stringify(map));
  };

  const getAttachments = (hid: string): VacancyAttachments => {
    if (!hid) return {};
    return safeJsonParse<VacancyAttachments>(localStorage.getItem(hrVacancyAttachmentsKey(hid)), {});
  };

  const saveAttachment = (hid: string, vacancyId: string, url: string, name?: string) => {
    if (!hid || !vacancyId) return;
    const map = getAttachments(hid);

    if (isStr(url)) {
      map[String(vacancyId)] = {
        url: String(url),
        name: isStr(name) ? String(name) : map[String(vacancyId)]?.name,
        updated_at: new Date().toISOString(),
      };
    } else {
      delete map[String(vacancyId)];
    }

    localStorage.setItem(hrVacancyAttachmentsKey(hid), JSON.stringify(map));
  };

  const deleteAttachment = (hid: string, vacancyId: string) => saveAttachment(hid, vacancyId, "");

  const getHrVacancyIds = (hid: string): string[] => {
    if (!hid) return [];
    const arr = safeJsonParse<string[]>(localStorage.getItem(hrVacancyIdsKey(hid)), []);
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  };

  const addHrVacancyId = (hid: string, vacancyId: string) => {
    if (!hid || !vacancyId) return;
    const set = new Set(getHrVacancyIds(hid));
    set.add(String(vacancyId));
    localStorage.setItem(hrVacancyIdsKey(hid), JSON.stringify(Array.from(set)));
  };

  const removeHrVacancyId = (hid: string, vacancyId: string) => {
    if (!hid || !vacancyId) return;
    const set = new Set(getHrVacancyIds(hid));
    set.delete(String(vacancyId));
    localStorage.setItem(hrVacancyIdsKey(hid), JSON.stringify(Array.from(set)));
  };

  const getLastCompanyId = (hid: string): string => {
    if (!hid) return "";
    return (localStorage.getItem(hrLastCompanyKey(hid)) || "").trim();
  };

  const setLastCompanyId = (hid: string, companyId: string) => {
    if (!hid || !companyId) return;
    localStorage.setItem(hrLastCompanyKey(hid), String(companyId));
  };

  const patchVacancyInList = (vacId: string, patch: Partial<VacancyItem>) => {
    setVacancies((prev) =>
      prev.map((v) => (String(v.id) === String(vacId) ? { ...v, ...patch } : v))
    );
  };

  const removeVacancyFromList = (vacId: string) => {
    setVacancies((prev) => prev.filter((v) => String(v.id) !== String(vacId)));
  };

  const reloadCompanies = async (ids: string[]) => {
    try {
      setCompaniesError("");
      setCompaniesLoading(true);

      const uniq = Array.from(new Set((ids || []).map(String))).filter(Boolean);
      if (uniq.length === 0) {
        setCompanies([]);
        return;
      }

      const res = await Promise.all(uniq.map((id) => fetchCompanyById(id)));
      setCompanies(res.filter(Boolean) as CompanyItem[]);
    } catch (e: any) {
      console.error("Не удалось загрузить компании:", e);
      setCompanies([]);
      setCompaniesError(e?.message || "Не удалось загрузить компании.");
    } finally {
      setCompaniesLoading(false);
    }
  };

  const reloadVacancies = async (hidForBindings: string) => {
    try {
      setVacanciesError("");
      setVacanciesLoading(true);

      const list = await fetchMyVacancies();

      const myIds = new Set<string>(getHrVacancyIds(hidForBindings));

      const bindings = getBindings(hidForBindings);
      Object.keys(bindings || {}).forEach((id) => myIds.add(String(id)));

      const attachments = getAttachments(hidForBindings);
      Object.keys(attachments || {}).forEach((id) => myIds.add(String(id)));

      const filtered = myIds.size
        ? list.filter((v: any) =>
            myIds.has(
              String((v as any)?.id ?? (v as any)?.vacancy_id ?? (v as any)?.uuid ?? "")
            )
          )
        : [];

      const patched = filtered.map((v) => {
        const nv = normalizeVacancy(v);
        const vid = nv.id ? String(nv.id) : "";

        if (!isStr(nv.company_id) && vid && bindings[String(vid)]?.company_id) {
          nv.company_id = bindings[String(vid)].company_id;
        }

        if (!isStr(nv.attachment_url) && vid && isStr(attachments[String(vid)]?.url)) {
          nv.attachment_url = attachments[String(vid)].url;
        }
        if (!isStr(nv.attachment_name) && vid && isStr(attachments[String(vid)]?.name)) {
          nv.attachment_name = attachments[String(vid)].name;
        }

        return nv;
      });

      setVacancies(patched);
    } catch (e: any) {
      console.error("Не удалось загрузить вакансии:", e);
      setVacancies([]);
      setVacanciesError(e?.message || "Не удалось загрузить вакансии.");
    } finally {
      setVacanciesLoading(false);
    }
  };

  useEffect(() => {
    const token = (localStorage.getItem("token") || "").trim();
    const role = (localStorage.getItem("role") || "").trim();
    const isHrRole = role === "hr" || role === "ROLE_EMPLOYER" || role === "ROLE_COMPANY";

    if (!token || !isHrRole) {
      navigate("/auth", { replace: true });
      return;
    }

    const load = async () => {
      try {
        setLoading(true);

        const resp = await apiGateway({ method: "GET", url: "/hr/me" });
        const data: UserProfile = unwrap(resp);
        setProfile(data);

        const hid = String((data as any)?.id || "");
        setHrId(hid);

        try {
          const list = await AchievementsAPI.list();
          const avatar = list.find(isAvatar);
          setAvatarUrl(avatar?.url || data?.avatar_url || null);
        } catch {
          setAvatarUrl(data?.avatar_url || null);
        }

        const storedIds = hid
          ? safeJsonParse<string[]>(localStorage.getItem(hrCompaniesKey(hid)), [])
          : [];
        const ids = Array.isArray(storedIds) ? storedIds : [];

        await reloadCompanies(ids);
        await reloadVacancies(hid);
      } catch (e) {
        console.error("HR profile load error:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/auth", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/auth", { replace: true });
  };

  const p = profile || {};
  const fullName = [p.last_name, p.first_name].filter(Boolean).join(" ") || "Профиль HR";

  const hasDescription = !!p.description && p.description.trim().length > 0;

  const tgRaw = (p.telegram || p.tg || "").trim();
  const tgShown = tgRaw ? (tgRaw.startsWith("@") ? tgRaw : `@${tgRaw}`) : "";
  const tgHandle = tgRaw ? tgRaw.replace("@", "") : "";

  const companiesCards = useMemo(() => {
    return companies.map((c, idx) => {
      const pack = decorPack[idx % decorPack.length];
      const logo = getCompanyLogoDataUrl(c.id) || c.logo_url || "";
      return {
        ...c,
        _color: pack.color,
        _decor: pack.decor,
        _logo: logo,
        _subtitle: [c.city, c.type?.value].filter(Boolean).join(" • "),
      };
    });
  }, [companies]);

  const openCompany = (c: CompanyItem) => {
    setSelectedCompany(normalizeCompany(c));
    setShowCompanyModal(true);
  };

  const closeCompany = () => {
    setShowCompanyModal(false);
    setSelectedCompany(null);
  };

  const openVacancyView = (v: VacancyItem) => {
    const nv = normalizeVacancy(v);
    const vid = nv.id ? String(nv.id) : "";

    if (hrId && vid) {
      const map = getAttachments(hrId);
      if (!isStr(nv.attachment_url) && isStr(map?.[vid]?.url)) nv.attachment_url = map[vid].url;
      if (!isStr(nv.attachment_name) && isStr(map?.[vid]?.name))
        nv.attachment_name = map[vid].name;
    }

    setVacAttFile(null);
    setVacAttErr("");
    setVacAttMsg("");

    setVacEditErr("");
    setVacEditMsg("");
    setIsVacEdit(false);

    setVacEditForm({
      company_id: nv.company_id ? String(nv.company_id) : "",
      title: nv.title || "",
      salary: typeof nv.salary === "number" ? String(nv.salary) : "",
      schedule: nv.schedule || "",
      work_format: nv.work_format || "",
      experience: typeof nv.experience === "number" ? String(nv.experience) : "",
      position_status: nv.position_status || "",
    });

    setSelectedVacancy(nv);
    setShowVacancyViewModal(true);
  };

  const closeVacancyView = () => {
    setShowVacancyViewModal(false);
    setSelectedVacancy(null);

    setVacAttFile(null);
    setVacAttErr("");
    setVacAttMsg("");

    setIsVacEdit(false);
    setVacEditErr("");
    setVacEditMsg("");
  };

  const openVacancyModal = () => {
    setVacancyErr("");
    setVacancyMsg("");
    setVacancyFile(null);

    const remembered = hrId ? getLastCompanyId(hrId) : "";
    const first = companies[0]?.id ? String(companies[0].id) : "";
    const preselected =
      remembered && companies.some((c) => String(c.id) === String(remembered)) ? remembered : first;

    setVacancyForm({
      company_id: preselected,
      title: "",
      salary: "",
      schedule: "",
      work_format: "",
      experience: "",
      position_status: "",
    });

    setShowVacancyModal(true);
  };

  const closeVacancyModal = () => setShowVacancyModal(false);

  const onVacancyField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVacancyForm((prev) => ({ ...prev, [name]: value }));

    if (name === "company_id" && hrId) setLastCompanyId(hrId, value);
  };

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setVacancyErr("");
    setVacancyMsg("");

    const title = vacancyForm.title.trim();
    if (!title) return setVacancyErr("Название вакансии — обязательное поле.");

    const companyId = (vacancyForm.company_id || "").trim();
    if (!companyId) return setVacancyErr("Выбери компанию.");

    const salaryNum = parseNumOrUndefined(vacancyForm.salary);
    const expNum = parseNumOrUndefined(vacancyForm.experience);

    if (vacancyForm.salary.trim() && salaryNum === undefined)
      return setVacancyErr("Зарплата должна быть числом.");
    if (vacancyForm.experience.trim() && expNum === undefined)
      return setVacancyErr("Опыт должен быть числом.");

    try {
      setVacancySaving(true);

      const { id: createdId } = await createVacancy({
        title,
        company_id: companyId,
        salary: salaryNum,
        schedule: vacancyForm.schedule.trim() || undefined,
        work_format: vacancyForm.work_format.trim() || undefined,
        experience: expNum,
        position_status: vacancyForm.position_status.trim() || undefined,
      });

      if (hrId && createdId) {
        saveBinding(hrId, createdId, companyId);
        addHrVacancyId(hrId, createdId);
        setLastCompanyId(hrId, companyId);
      }

      if (createdId && vacancyFile) {
        const up = await uploadVacancyAttachment(createdId, vacancyFile);
        const originalName = vacancyFile.name;

        if (hrId) saveAttachment(hrId, createdId, up.url, originalName);
        patchVacancyInList(createdId, { attachment_url: up.url, attachment_name: originalName });
      }

      setVacancyMsg(vacancyFile ? "Вакансия создана и файл загружен!" : "Вакансия создана!");
      await reloadVacancies(hrId);

      setTimeout(() => setShowVacancyModal(false), 350);
    } catch (err: any) {
      console.error("CREATE VACANCY ERROR:", err);
      setVacancyErr(err?.message || "Не удалось создать вакансию.");
    } finally {
      setVacancySaving(false);
    }
  };

  const handleUploadInViewModal = async () => {
    setVacAttErr("");
    setVacAttMsg("");

    const vacId = String(selectedVacancy?.id || "");
    if (!vacId) return setVacAttErr("Не найден id вакансии.");
    if (!vacAttFile) return setVacAttErr("Выбери файл для загрузки.");

    try {
      setVacAttUploading(true);

      const up = await uploadVacancyAttachment(vacId, vacAttFile);
      const originalName = vacAttFile.name;

      if (hrId) saveAttachment(hrId, vacId, up.url, originalName);

      setVacAttMsg("Файл загружен!");
      setVacAttFile(null);

      setSelectedVacancy((prev) =>
        prev ? { ...prev, attachment_url: up.url, attachment_name: originalName } : prev
      );
      patchVacancyInList(vacId, { attachment_url: up.url, attachment_name: originalName });
      await reloadVacancies(hrId);
    } catch (e: any) {
      setVacAttErr(e?.message || "Не удалось загрузить файл.");
    } finally {
      setVacAttUploading(false);
    }
  };

  const handleDeleteInViewModal = async () => {
    setVacAttErr("");
    setVacAttMsg("");

    const vacId = String(selectedVacancy?.id || "");
    if (!vacId) return setVacAttErr("Не найден id вакансии.");

    try {
      setVacAttUploading(true);
      await deleteVacancyAttachment(vacId);

      if (hrId) deleteAttachment(hrId, vacId);

      setVacAttMsg("Вложение удалено.");
      setSelectedVacancy((prev) =>
        prev ? { ...prev, attachment_url: "", attachment_name: "" } : prev
      );
      patchVacancyInList(vacId, { attachment_url: "", attachment_name: "" });
      await reloadVacancies(hrId);
    } catch (e: any) {
      setVacAttErr(e?.message || "Не удалось удалить вложение.");
    } finally {
      setVacAttUploading(false);
    }
  };

  const handleDeleteVacancy = async () => {
    const vacId = String(selectedVacancy?.id || "");
    if (!vacId) return;

    const ok = window.confirm("Удалить вакансию? Это действие нельзя отменить.");
    if (!ok) return;

    try {
      setVacEditErr("");
      setVacEditMsg("");
      setVacAttErr("");
      setVacAttMsg("");
      setVacAttUploading(true);

      await deleteVacancy(vacId);

      if (hrId) {
        deleteBinding(hrId, vacId);
        deleteAttachment(hrId, vacId);
        removeHrVacancyId(hrId, vacId);
      }

      removeVacancyFromList(vacId);
      closeVacancyView();
    } catch (e: any) {
      setVacEditErr(e?.message || "Не удалось удалить вакансию.");
    } finally {
      setVacAttUploading(false);
    }
  };

  const startVacEdit = () => {
    setVacEditErr("");
    setVacEditMsg("");
    setVacAttErr("");
    setVacAttMsg("");
    setVacAttFile(null);
    setIsVacEdit(true);
  };

  const cancelVacEdit = () => {
    const nv = normalizeVacancy(selectedVacancy || {});
    setVacEditForm({
      company_id: nv.company_id ? String(nv.company_id) : "",
      title: nv.title || "",
      salary: typeof nv.salary === "number" ? String(nv.salary) : "",
      schedule: nv.schedule || "",
      work_format: nv.work_format || "",
      experience: typeof nv.experience === "number" ? String(nv.experience) : "",
      position_status: nv.position_status || "",
    });
    setVacEditErr("");
    setVacEditMsg("");
    setVacAttErr("");
    setVacAttMsg("");
    setVacAttFile(null);
    setIsVacEdit(false);
  };

  const onVacEditField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVacEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveVacEdit = async () => {
    setVacEditErr("");
    setVacEditMsg("");

    const vacId = String(selectedVacancy?.id || "");
    if (!vacId) return setVacEditErr("Не найден id вакансии.");

    const title = vacEditForm.title.trim();
    if (!title) return setVacEditErr("Название вакансии — обязательное поле.");

    const companyId = (vacEditForm.company_id || "").trim();
    if (!companyId) return setVacEditErr("Выбери компанию.");

    const salaryNum = parseNumOrUndefined(vacEditForm.salary);
    const expNum = parseNumOrUndefined(vacEditForm.experience);

    if (vacEditForm.salary.trim() && salaryNum === undefined)
      return setVacEditErr("Зарплата должна быть числом.");
    if (vacEditForm.experience.trim() && expNum === undefined)
      return setVacEditErr("Опыт должен быть числом.");

    try {
      setVacEditSaving(true);

      await updateVacancy(vacId, {
        title,
        company_id: companyId,
        salary: salaryNum,
        schedule: vacEditForm.schedule.trim() || undefined,
        work_format: vacEditForm.work_format.trim() || undefined,
        experience: expNum,
        position_status: vacEditForm.position_status.trim() || undefined,
      });

      if (hrId) {
        saveBinding(hrId, vacId, companyId);
        addHrVacancyId(hrId, vacId);
      }

      const patch: Partial<VacancyItem> = {
        title,
        company_id: companyId,
        salary: salaryNum,
        schedule: vacEditForm.schedule.trim(),
        work_format: vacEditForm.work_format.trim(),
        experience: expNum,
        position_status: vacEditForm.position_status.trim(),
      };

      setSelectedVacancy((prev) => (prev ? { ...prev, ...patch } : prev));
      patchVacancyInList(vacId, patch);

      setVacEditMsg("Изменения сохранены!");
      setIsVacEdit(false);

      await reloadVacancies(hrId);
    } catch (e: any) {
      setVacEditErr(e?.message || "Не удалось обновить вакансию.");
    } finally {
      setVacEditSaving(false);
    }
  };

  const companyBanner =
    (selectedCompany?.id ? getCompanyLogoDataUrl(selectedCompany.id) : null) ||
    selectedCompany?.logo_url ||
    "";

  const companySubtitle = [selectedCompany?.city || "", selectedCompany?.type?.value || ""]
    .filter(Boolean)
    .join(" • ");

  const companySite = (selectedCompany?.site || "").trim();
  const companySiteHref = companySite ? (companySite.startsWith("http") ? companySite : `https://${companySite}`) : "";

  const effectiveCompanyId = isVacEdit
    ? (vacEditForm.company_id || "").trim()
    : String(selectedVacancy?.company_id || "");

  const vacancyCompany = effectiveCompanyId
    ? companies.find((c) => String(c.id) === String(effectiveCompanyId))
    : undefined;

  const vacancyCompanyName = vacancyCompany?.name || "Компания";

  const vacancySubtitle = [vacancyCompany?.city || "", vacancyCompany?.type?.value || ""]
    .filter(Boolean)
    .join(" • ");

  const attachmentUrl = (() => {
    const fromState = (selectedVacancy?.attachment_url || "").trim();
    if (isStr(fromState)) return fromState;

    const vacId = String(selectedVacancy?.id || "");
    if (!hrId || !vacId) return "";
    const m = getAttachments(hrId);
    const u = m?.[vacId]?.url;
    return isStr(u) ? u : "";
  })();

  const attachmentLabel = (() => {
    const fromState = (selectedVacancy?.attachment_name || "").trim();
    if (isStr(fromState)) return fromState;

    const vacId = String(selectedVacancy?.id || "");
    if (hrId && vacId) {
      const m = getAttachments(hrId);
      const nm = m?.[vacId]?.name;
      if (isStr(nm)) return nm;
    }

    return "открыть файл";
  })();

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
                    <a href={`https://t.me/${tgHandle}`} target="_blank" rel="noopener noreferrer">
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

          <button
            className="profile-btn"
            onClick={() => navigate("/hr-profile/edit")}
            title="Компании добавляются в редактировании профиля"
          >
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
          ) : vacancies.length === 0 ? (
            <p style={{ marginTop: 12 }}>Пока нет вакансий. Создай первую — и она появится здесь.</p>
          ) : (
            <div style={{ marginTop: 18, overflow: "hidden" }}>
              <div className="hr-carousel__track" role="region" aria-label="Вакансии">
                {vacancies.map((vac: any, idx: number) => {
                  const pack = decorPack[idx % decorPack.length];
                  const v = normalizeVacancy(vac);

                  const subtitle = [
                    v.salary ? money(v.salary) : "",
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
                      <h3>{v.title || "Вакансия"}</h3>
                      {subtitle ? <p style={{ marginTop: 6, opacity: 0.9 }}>{subtitle}</p> : null}
                      <span className="hr-card-link">Посмотреть</span>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="hr-section">
          <h3>Компании в профиле HR:</h3>

          {companiesLoading ? (
            <div className="hr-cards">
              <article className="hr-card hr-card--green">
                <div className="hr-card-decor">
                  <img src={spiral} alt="" />
                </div>
                <h3>Загрузка...</h3>
                <span className="hr-card-link">Пожалуйста, подождите</span>
              </article>
            </div>
          ) : companiesError ? (
            <p style={{ color: "#d00", marginTop: 12 }}>{companiesError}</p>
          ) : companiesCards.length === 0 ? (
            <p style={{ marginTop: 12 }}>
              Пока нет компаний. Добавь их в <strong>Редактировании профиля</strong>.
            </p>
          ) : (
            <div className="hr-cards">
              {companiesCards.map((comp: any, idx: number) => (
                <article
                  key={comp.id || `comp-${idx}`}
                  className={`hr-card hr-card--${comp._color}`}
                  style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}
                  onClick={() => openCompany(comp)}
                  title="Открыть"
                >
                  {comp._logo ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url("${comp._logo}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        opacity: 0.38,
                        zIndex: 0,
                        transform: "scale(1.03)",
                      }}
                    />
                  ) : null}

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.10))",
                      zIndex: 1,
                    }}
                  />

                  <div className="hr-card-decor" style={{ position: "relative", zIndex: 2 }}>
                    <img src={comp._decor} alt="" />
                  </div>

                  <div style={{ position: "relative", zIndex: 2 }}>
                    <h3>{comp.name || "Компания"}</h3>
                    {comp._subtitle ? <p style={{ marginTop: 6, opacity: 0.9 }}>{comp._subtitle}</p> : null}
                    <span className="hr-card-link">Посмотреть</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {showCompanyModal && selectedCompany && (
          <div className="mj-modal-backdrop" onClick={closeCompany}>
            <div
              className="mj-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(980px, calc(100vw - 40px))",
                maxWidth: "980px",
                borderRadius: 18,
                padding: 0,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "26px 30px 16px 30px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
                      {selectedCompany.name || "Компания"}
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.7 }}>{companySubtitle || "—"}</div>
                  </div>

                  <button
                    type="button"
                    onClick={closeCompany}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      padding: "8px 10px",
                    }}
                  ></button>
                </div>

                <div style={{ marginTop: 18, height: 1, background: "rgba(0,0,0,0.08)" }} />
              </div>

              <div style={{ padding: "18px 30px 22px 30px" }}>
                <div
                  style={{
                    width: "100%",
                    height: 210,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.04)",
                  }}
                >
                  {companyBanner ? (
                    <img
                      src={companyBanner}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Город</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedCompany.city || "—"}</div>

                    <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                      Описание
                    </div>
                    <div style={{ fontSize: 16 }}>
                      {selectedCompany.description?.trim() ? selectedCompany.description : "—"}
                    </div>

                    <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Сайт</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {companySiteHref ? (
                        <a
                          href={companySiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "underline" }}
                        >
                          {companySiteHref}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Тип</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedCompany.type?.value || "—"}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "16px 30px 22px 30px" }}>
                <div style={{ height: 1, background: "rgba(0,0,0,0.08)", marginBottom: 16 }} />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={closeCompany}
                    style={{
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "12px 18px",
                      cursor: "pointer",
                      fontWeight: 800,
                      minWidth: 64,
                    }}
                  >
                    Ok
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showVacancyViewModal && selectedVacancy && (
          <div className="mj-modal-backdrop" onClick={closeVacancyView}>
            <div
              className="mj-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(980px, calc(100vw - 40px))",
                maxWidth: "980px",
                borderRadius: 18,
                padding: 0,
                overflow: "hidden",
              }}
            >
              {/* header */}
              <div style={{ padding: "26px 30px 16px 30px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
                      {isVacEdit ? (
                        <input
                          value={vacEditForm.title}
                          name="title"
                          onChange={onVacEditField}
                          style={{
                            fontSize: 28,
                            fontWeight: 800,
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            width: "min(560px, 65vw)",
                          }}
                        />
                      ) : (
                        selectedVacancy.title || "Вакансия"
                      )}
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.7 }}>
                      {vacancyCompanyName}
                      {vacancySubtitle ? ` • ${vacancySubtitle}` : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeVacancyView}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      padding: "8px 10px",
                    }}
                  ></button>
                </div>

                <div style={{ marginTop: 18, height: 1, background: "rgba(0,0,0,0.08)" }} />
              </div>

              <div style={{ padding: "18px 30px 22px 30px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Зарплата</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {isVacEdit ? (
                        <input
                          value={vacEditForm.salary}
                          name="salary"
                          onChange={onVacEditField}
                          placeholder="90000"
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            width: 240,
                          }}
                        />
                      ) : (
                        money(selectedVacancy.salary)
                      )}
                    </div>

                    <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6, marginBottom: 6 }}>График</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {isVacEdit ? (
                        <input
                          value={vacEditForm.schedule}
                          name="schedule"
                          onChange={onVacEditField}
                          placeholder="5/2"
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            width: 240,
                          }}
                        />
                      ) : (
                        selectedVacancy.schedule || "—"
                      )}
                    </div>

                    <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                      Формат работы
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {isVacEdit ? (
                        <input
                          value={vacEditForm.work_format}
                          name="work_format"
                          onChange={onVacEditField}
                          placeholder="Гибрид / Офис / Удалёнка"
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            width: 320,
                          }}
                        />
                      ) : (
                        selectedVacancy.work_format || "—"
                      )}
                    </div>

                    {/* Вложение */}
                    <div style={{ marginTop: 22 }}>
                      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>Вложение (файл)</div>

                      {!isVacEdit ? (
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          {attachmentUrl ? (
                            <a
                              href={attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "inherit", textDecoration: "underline" }}
                            >
                              {attachmentLabel}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                          {attachmentUrl ? (
                            <a
                              href={attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "inherit",
                                textDecoration: "underline",
                                fontWeight: 800,
                              }}
                            >
                              {attachmentLabel}
                            </a>
                          ) : (
                            <div style={{ fontWeight: 700, opacity: 0.7 }}>—</div>
                          )}

                          <input
                            type="file"
                            onChange={(e) => setVacAttFile(e.target.files?.[0] || null)}
                            style={{ maxWidth: 320 }}
                          />

                          <button
                            type="button"
                            onClick={handleUploadInViewModal}
                            disabled={vacAttUploading || !vacAttFile}
                            style={{
                              background: "#111",
                              color: "#fff",
                              border: "none",
                              borderRadius: 10,
                              padding: "10px 14px",
                              cursor: vacAttUploading ? "default" : "pointer",
                              fontWeight: 800,
                              opacity: vacAttUploading || !vacAttFile ? 0.7 : 1,
                            }}
                          >
                            {vacAttUploading ? "Загрузка..." : attachmentUrl ? "Заменить" : "Загрузить"}
                          </button>

                          {attachmentUrl ? (
                            <button
                              type="button"
                              onClick={handleDeleteInViewModal}
                              disabled={vacAttUploading}
                              style={{
                                background: "transparent",
                                color: "#111",
                                border: "1px solid rgba(0,0,0,.2)",
                                borderRadius: 10,
                                padding: "10px 14px",
                                cursor: vacAttUploading ? "default" : "pointer",
                                fontWeight: 800,
                                opacity: vacAttUploading ? 0.7 : 1,
                              }}
                            >
                              Удалить файл
                            </button>
                          ) : null}

                          {vacAttErr ? (
                            <div style={{ width: "100%", marginTop: 8, color: "#d00", fontWeight: 700 }}>
                              {vacAttErr}
                            </div>
                          ) : null}
                          {vacAttMsg ? (
                            <div style={{ width: "100%", marginTop: 8, color: "#0a7", fontWeight: 700 }}>
                              {vacAttMsg}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Опыт</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {isVacEdit ? (
                        <input
                          value={vacEditForm.experience}
                          name="experience"
                          onChange={onVacEditField}
                          placeholder="1"
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            width: 160,
                          }}
                        />
                      ) : typeof selectedVacancy.experience === "number" ? (
                        `${selectedVacancy.experience}`
                      ) : (
                        "—"
                      )}
                    </div>

                    <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Статус</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {isVacEdit ? (
                        <input
                          value={vacEditForm.position_status}
                          name="position_status"
                          onChange={onVacEditField}
                          placeholder="open"
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            width: 220,
                          }}
                        />
                      ) : (
                        selectedVacancy.position_status || "—"
                      )}
                    </div>

                    <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Компания</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {isVacEdit ? (
                        <select
                          value={vacEditForm.company_id}
                          name="company_id"
                          onChange={onVacEditField}
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            border: "1px solid rgba(0,0,0,.12)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            width: 320,
                          }}
                        >
                          <option value="">— выбрать —</option>
                          {companies.map((c) => (
                            <option key={String(c.id)} value={String(c.id)}>
                              {c.name || c.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        vacancyCompanyName || "—"
                      )}
                    </div>
                  </div>
                </div>

                {vacEditErr ? <div style={{ marginTop: 12, color: "#d00", fontWeight: 700 }}>{vacEditErr}</div> : null}
                {vacEditMsg ? <div style={{ marginTop: 12, color: "#0a7", fontWeight: 700 }}>{vacEditMsg}</div> : null}
              </div>

              <div style={{ padding: "16px 30px 22px 30px" }}>
                <div style={{ height: 1, background: "rgba(0,0,0,0.08)", marginBottom: 16 }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {!isVacEdit ? (
                      <button
                        type="button"
                        onClick={startVacEdit}
                        style={{
                          background: "#111",
                          color: "#fff",
                          border: "none",
                          borderRadius: 12,
                          padding: "12px 18px",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Редактировать
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={saveVacEdit}
                          disabled={vacEditSaving}
                          style={{
                            background: "#111",
                            color: "#fff",
                            border: "none",
                            borderRadius: 12,
                            padding: "12px 18px",
                            cursor: vacEditSaving ? "default" : "pointer",
                            fontWeight: 800,
                            opacity: vacEditSaving ? 0.7 : 1,
                          }}
                        >
                          {vacEditSaving ? "Сохраняем..." : "Сохранить"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelVacEdit}
                          disabled={vacEditSaving}
                          style={{
                            background: "transparent",
                            color: "#111",
                            border: "1px solid rgba(0,0,0,.2)",
                            borderRadius: 12,
                            padding: "12px 18px",
                            cursor: vacEditSaving ? "default" : "pointer",
                            fontWeight: 800,
                            opacity: vacEditSaving ? 0.7 : 1,
                          }}
                        >
                          Отмена
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleDeleteVacancy}
                      disabled={vacAttUploading || vacEditSaving}
                      style={{
                        background: "transparent",
                        color: "#b00",
                        border: "1px solid rgba(176,0,0,.35)",
                        borderRadius: 12,
                        padding: "12px 18px",
                        cursor: vacAttUploading || vacEditSaving ? "default" : "pointer",
                        fontWeight: 900,
                        opacity: vacAttUploading || vacEditSaving ? 0.6 : 1,
                      }}
                      title="Удалить вакансию"
                    >
                      Удалить вакансию
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={closeVacancyView}
                    style={{
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "12px 18px",
                      cursor: "pointer",
                      fontWeight: 800,
                      minWidth: 64,
                    }}
                  >
                    Ok
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showVacancyModal && (
          <div className="mj-modal-backdrop" onClick={closeVacancyModal}>
            <div className="mj-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mj-modal-header">
                <div>
                  <h2 className="mj-modal-title">Создание вакансии</h2>
                  <p className="mj-modal-subtitle"></p>
                </div>
                <button className="mj-btn mj-btn--ghost" type="button" onClick={closeVacancyModal}></button>
              </div>

              <form onSubmit={handleCreateVacancy}>
                <div className="mj-field" style={{ marginBottom: 14 }}>
                  <label className="mj-label">
                    Компания <span style={{ color: "#d00" }}>*</span>
                  </label>
                  <select className="mj-input" name="company_id" value={vacancyForm.company_id} onChange={onVacancyField}>
                    <option value="">— выбрать —</option>
                    {companies.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>

                  {companies.length === 0 ? <div className="mj-note">Нет компаний — добавь их в редактировании профиля HR.</div> : null}
                </div>

                <div className="mj-grid">
                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">
                      Название <span style={{ color: "#d00" }}>*</span>
                    </label>
                    <input className="mj-input" name="title" value={vacancyForm.title} onChange={onVacancyField} placeholder="Например: Frontend Developer" />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Зарплата</label>
                    <input className="mj-input" name="salary" value={vacancyForm.salary} onChange={onVacancyField} placeholder="50000" />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">График (schedule)</label>
                    <input className="mj-input" name="schedule" value={vacancyForm.schedule} onChange={onVacancyField} placeholder="5/2" />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Формат работы (work_format)</label>
                    <input className="mj-input" name="work_format" value={vacancyForm.work_format} onChange={onVacancyField} placeholder="Удалёнка / Офис / Гибрид" />
                  </div>

                  <div className="mj-field">
                    <label className="mj-label">Опыт (experience, число)</label>
                    <input className="mj-input" name="experience" value={vacancyForm.experience} onChange={onVacancyField} placeholder="1" />
                  </div>

                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">Статус (position_status)</label>
                    <input className="mj-input" name="position_status" value={vacancyForm.position_status} onChange={onVacancyField} placeholder="open" />
                  </div>

                  <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="mj-label">Вложение (файл, до 10MB)</label>
                    <input className="mj-input" type="file" onChange={(e) => setVacancyFile(e.target.files?.[0] || null)} />
                    <div className="mj-note">Файл загрузится автоматически сразу после создания вакансии.</div>
                  </div>
                </div>

                {vacancyErr ? <div className="mj-alert mj-alert--err">{vacancyErr}</div> : null}
                {vacancyMsg ? <div className="mj-alert mj-alert--ok">{vacancyMsg}</div> : null}

                <div className="mj-actions">
                  <button className="mj-btn mj-btn--primary" type="submit" disabled={vacancySaving} style={{ opacity: vacancySaving ? 0.7 : 1 }}>
                    {vacancySaving ? "Создаём..." : "Создать вакансию"}
                  </button>

                  <button className="mj-btn mj-btn--ghost" type="button" onClick={closeVacancyModal} disabled={vacancySaving} style={{ opacity: vacancySaving ? 0.7 : 1 }}>
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
