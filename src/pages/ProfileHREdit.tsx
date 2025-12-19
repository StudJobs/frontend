import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-edit-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarDefault from "../assets/images/человек.png";
import { apiGateway } from "../api/apiGateway";
import { AchievementsAPI } from "../api/achievements";

type CompanyType = { value?: string };

type CompanyDTO = {
  id?: string;
  name?: string;
  city?: string;
  site?: string;
  description?: string;
  logo_url?: string;
  logo_id?: string;
  type?: CompanyType;
};

const extractAvatarUrl = (fileInfo: any): string | undefined =>
  fileInfo?.download_url || fileInfo?.direct_url || fileInfo?.url;

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, "") || "";

const AVATAR_PREFIX = "user_avatar_";
const hasAvatarPrefix = (v?: string | null) =>
  !!v && String(v).startsWith(AVATAR_PREFIX);

const isStr = (v: any) => typeof v === "string" && v.trim().length > 0;

const normalizeTelegram = (value: string): string | undefined => {
  const v = (value || "").trim();
  if (!v) return undefined;

  const cleaned = v.replace(/^https?:\/\/t\.me\//i, "");
  const username = cleaned.replace(/^@/, "").trim();

  return username ? `@${username}` : undefined;
};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const hrCompaniesKey = (hrId: string) => `hr_companies_${hrId}`;

const COMPANY_LIST_ENDPOINT = "/companies";

async function fetchCompanyById(id: string): Promise<CompanyDTO | null> {
  try {
    const resp = await apiGateway({ method: "GET", url: `/company/${id}` });
    const data: any = (resp as any)?.data ?? resp ?? null;
    return data as CompanyDTO;
  } catch {
    return null;
  }
}

async function searchCompanies(query: string): Promise<CompanyDTO[]> {
  const q = query.trim();

  try {
    const resp = await apiGateway({
      method: "GET",
      url: COMPANY_LIST_ENDPOINT,
      params: q ? ({ q } as any) : undefined,
    });
    const data: any = (resp as any)?.data ?? resp ?? {};
    const arr =
      Array.isArray(data) ? data :
      Array.isArray(data?.items) ? data.items :
      Array.isArray(data?.companies) ? data.companies :
      Array.isArray(data?.results) ? data.results :
      [];
    if (Array.isArray(arr)) return arr as CompanyDTO[];
  } catch {
  }

  try {
    const resp = await apiGateway({
      method: "GET",
      url: "/company",
      params: q ? ({ q } as any) : undefined,
    });
    const data: any = (resp as any)?.data ?? resp ?? {};
    const arr =
      Array.isArray(data) ? data :
      Array.isArray(data?.items) ? data.items :
      Array.isArray(data?.companies) ? data.companies :
      Array.isArray(data?.results) ? data.results :
      [];
    if (Array.isArray(arr)) return arr as CompanyDTO[];
  } catch {
  }

  return [];
}

function CompanyCarousel({
  items,
  onRemove,
  title,
}: {
  title: string;
  items: CompanyDTO[];
  onRemove: (companyId: string) => void;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>

      {items.length === 0 ? (
        <div style={{ opacity: 0.7 }}>—</div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {items.map((c) => {
            const id = String(c.id || "");
            return (
              <div
                key={id}
                style={{
                  minWidth: 260,
                  maxWidth: 260,
                  borderRadius: 18,
                  background: "#fff",
                  boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
                  padding: 14,
                  position: "relative",
                }}
              >
                <button
                  type="button"
                  title="Удалить"
                  aria-label="Удалить"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(id);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 10,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 18,
                    fontWeight: 800,
                    lineHeight: 1,
                    padding: "2px 6px",
                  }}
                >
                  ×
                </button>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: "#f2f2f2",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {isStr(c.logo_url) ? (
                      <img
                        src={c.logo_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : null}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={c.name}
                    >
                      {c.name || "Компания"}
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      {c.city || "—"} • {c.type?.value || "—"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                  {isStr(c.site) ? (
                    <span style={{ textDecoration: "underline" }}>{c.site}</span>
                  ) : (
                    "—"
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    opacity: 0.85,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  }}
                  title={c.description}
                >
                  {isStr(c.description) ? c.description : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompanyPicker({
  alreadyIds,
  onAdd,
}: {
  alreadyIds: string[];
  onAdd: (company: CompanyDTO) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CompanyDTO[]>([]);
  const [error, setError] = useState<string>("");

  const filtered = useMemo(() => {
    const used = new Set(alreadyIds.map(String));
    return (items || []).filter((c) => !used.has(String(c.id || "")));
  }, [items, alreadyIds]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        setLoading(true);
        const res = await searchCompanies(query);
        if (!alive) return;
        setItems(res);
      } catch {
        if (!alive) return;
        setError("Не удалось загрузить список компаний.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [query]);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Добавить компанию</div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по названию / городу..."
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid #d9d9d9",
          padding: "10px 12px",
          outline: "none",
        }}
      />

      {loading && <div style={{ marginTop: 8, opacity: 0.7 }}>Загрузка…</div>}
      {error && <div style={{ marginTop: 8, color: "#b00020" }}>{error}</div>}

      {!loading && !error && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.slice(0, 8).map((c) => {
            const id = String(c.id || "");
            return (
              <button
                key={id || `${c.name}_${Math.random()}`}
                type="button"
                onClick={() => onAdd(c)}
                disabled={!isStr(id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  padding: "10px 12px",
                  cursor: isStr(id) ? "pointer" : "not-allowed",
                  textAlign: "left",
                }}
              >
                <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.name || "Компания"}
                  <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>
                    {c.city ? `(${c.city})` : ""}
                  </span>
                </span>
                <span style={{ fontWeight: 800 }}>＋</span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ marginTop: 6, opacity: 0.7 }}>Ничего не найдено.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileHREdit() {
  const navigate = useNavigate();

  const [photo, setPhoto] = useState<string>(avatarDefault);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [avatarId, setAvatarId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    surname: "",
    name: "",
    age: "",
    email: "",
    telegram: "",
    profile: "",
    description: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState("");

  const [hrId, setHrId] = useState<string>("");
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [companies, setCompanies] = useState<CompanyDTO[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const persistCompanyIds = (next: string[]) => {
    const uniq = Array.from(new Set(next.map(String))).filter(Boolean);
    setCompanyIds(uniq);
    if (hrId) localStorage.setItem(hrCompaniesKey(hrId), JSON.stringify(uniq));
  };

  const removeCompany = (id: string) => {
    persistCompanyIds(companyIds.filter((x) => String(x) !== String(id)));
  };

  const addCompany = (c: CompanyDTO) => {
    const id = String(c.id || "");
    if (!isStr(id)) return;
    persistCompanyIds([id, ...companyIds]);
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

    (async () => {
      try {
        const raw = await apiGateway({ method: "GET", url: "/hr/me" });
        const data = (raw as any)?.data ?? raw ?? {};

        const hrIdValue = String(data?.id || data?.hr_id || "");
        setHrId(hrIdValue);

        setFormData((prev) => ({
          ...prev,
          surname: data.last_name ?? "",
          name: data.first_name ?? "",
          age: data.age ? String(data.age) : "",
          email: data.email ?? "",
          telegram: data.telegram ?? data.tg ?? "",
          profile: data.profession_category ?? data.specialization ?? "",
          description: data.description ?? "",
        }));

        if (data.avatar_id) setAvatarId(String(data.avatar_id));

        if (isStr(hrIdValue)) {
          const ids = safeJsonParse<string[]>(
            localStorage.getItem(hrCompaniesKey(hrIdValue)),
            []
          );
          setCompanyIds(Array.isArray(ids) ? ids : []);
        }

        try {
          const list = await AchievementsAPI.list();
          const avatarItem = list.find((it: any) =>
            [it?.id, it?.name, it?.file_name].some((v: any) => hasAvatarPrefix(v))
          );

          if (avatarItem?.url) setPhoto(avatarItem.url);
          else if (data.avatar_url) setPhoto(data.avatar_url);
        } catch (err) {
          console.warn("Не удалось получить аватар:", err);
          if (data.avatar_url) setPhoto(data.avatar_url);
        }
      } catch (e) {
        console.error("Не удалось загрузить профиль HR для редактирования", e);
        setMessage("Не удалось загрузить профиль. Попробуйте позже.");
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (!hrId) return;

    const run = async () => {
      setCompaniesLoading(true);
      try {
        const uniq = Array.from(new Set(companyIds.map(String))).filter(Boolean);
        const res = await Promise.all(uniq.map((id) => fetchCompanyById(id)));
        setCompanies(res.filter(Boolean) as CompanyDTO[]);
      } finally {
        setCompaniesLoading(false);
      }
    };

    run();
  }, [hrId, companyIds]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setPhoto(ev.target.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setAvatarUploading(true);
      setMessage("");

      const fd = new FormData();
      fd.append("avatar", file);

      const token = localStorage.getItem("token") || "";

      const resp = await fetch(`${API_BASE}/users/files/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("Upload avatar HTTP error:", resp.status, text);
        setMessage(`Не удалось загрузить аватар (код ${resp.status}).`);
        return;
      }

      const json = (await resp.json().catch(() => ({}))) as any;
      const fileInfo = json?.file_info ?? json?.data?.file_info ?? json;

      const newAvatarId: string | undefined =
        fileInfo?.id || fileInfo?.file_id || fileInfo?.avatar_id;

      const newAvatarUrl: string | undefined = extractAvatarUrl(fileInfo);

      if (newAvatarId) setAvatarId(String(newAvatarId));
      if (newAvatarUrl) setPhoto(newAvatarUrl);

      setMessage("Аватар обновлён! Не забудьте сохранить профиль.");
    } catch (err: any) {
      console.error("Ошибка загрузки аватара (fetch):", err);
      const status = err?.status ?? err?.response?.status ?? null;
      if (status === 401 || status === 403) {
        setMessage("Сессия истекла. Зайдите в аккаунт заново.");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1200);
      } else {
        setMessage("Не удалось загрузить аватар. Попробуйте позже.");
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    const requiredFields: Array<keyof typeof formData> = [
      "surname",
      "name",
      "age",
      "email",
      "profile",
    ];

    requiredFields.forEach((field) => {
      if (!String(formData[field] || "").trim()) {
        newErrors[String(field)] = "Обязательное поле";
      }
    });

    if (
      formData.email &&
      !/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(formData.email)
    ) {
      newErrors.email = "Некорректная почта";
    }

    if (formData.age) {
      const n = Number(formData.age);
      if (!Number.isFinite(n) || n <= 0) {
        newErrors.age = "Некорректный возраст";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validate();
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      setMessage("Пожалуйста, заполните все обязательные поля корректно.");
      return;
    }

    try {
      setMessage("");

      const payload: any = {
        first_name: formData.name.trim(),
        last_name: formData.surname.trim(),
        age: formData.age ? Number(formData.age) : undefined,
        email: formData.email.trim() || undefined,
        telegram: normalizeTelegram(formData.telegram),
        profession_category: formData.profile || undefined,
        description: formData.description || undefined,
      };

      if (avatarId && !hasAvatarPrefix(avatarId)) {
        payload.avatar_id = avatarId;
      }

      const resp = await apiGateway({
        method: "PATCH",
        url: "/hr/edit",
        data: payload,
      });

      console.log("HR Profile edit response:", resp);
      setMessage("Данные успешно обновлены!");
      setTimeout(() => navigate("/hr-profile", { replace: true }), 250);
    } catch (err: any) {
      console.error("Ошибка сохранения профиля HR:", err);
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "";
      setMessage(
        backendMsg
          ? `Не удалось сохранить профиль: ${backendMsg}`
          : "Не удалось сохранить профиль. Попробуйте позже."
      );
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-edit-section">
        <h2 className="edit-title">Редактирование профиля HR</h2>

        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="photo-upload">
            <img src={photo} alt="Фото профиля" className="profile-preview-rect" />
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
            <label htmlFor="file-upload" className="upload-btn">
              {avatarUploading ? "Загружаем..." : "Изменить фото"}
            </label>
          </div>

          <h3 className="subsection-title">Основная информация</h3>

          <div className="form-row">
            {[
              ["surname", "Фамилия", true],
              ["name", "Имя", true],
            ].map(([field, label, required]) => (
              <div className="form-field" key={field as string}>
                <label className="label-title">
                  {label} {required && <span className="required">*</span>}
                </label>
                <input
                  name={field as string}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                  className={errors[field as string] ? "error" : ""}
                />
                {errors[field as string] && (
                  <p className="error-text">{errors[field as string]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="label-title">
                Возраст <span className="required">*</span>
              </label>
              <input
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                className={errors.age ? "error" : ""}
              />
              {errors.age && <p className="error-text">{errors.age}</p>}
            </div>

            <div className="form-field">
              <label className="label-title">
                Профиль <span className="required">*</span>
              </label>
              <select
                name="profile"
                value={formData.profile}
                onChange={handleChange}
                className={errors.profile ? "error" : ""}
              >
                <option value="">Выберите</option>
                {[
                  "АСОИУ",
                  "Программная инженерия",
                  "Информационная безопасность",
                  "Бизнес-информатика",
                  "Мехатроника и робототехника",
                  "Дизайн",
                  "Журналистика",
                  "Геймдев",
                  "Веб-дизайн",
                  "Машиностроение",
                  "Ювелирное дело",
                  "Fullstack Developer",
                ].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.profile && <p className="error-text">{errors.profile}</p>}
            </div>
          </div>

          <h3 className="subsection-title">Контакты</h3>
          <div className="form-row">
            <div className="form-field">
              <label className="label-title">
                Электронная почта <span className="required">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "error" : ""}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="form-field">
              <label className="label-title">Telegram</label>
              <input
                name="telegram"
                value={formData.telegram}
                onChange={handleChange}
                placeholder="@username"
              />
            </div>
          </div>

          <h3 className="subsection-title">О себе</h3>
          <div className="form-field">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            {companiesLoading ? (
              <div style={{ opacity: 0.7, marginTop: 12 }}>Загрузка компаний…</div>
            ) : (
              <CompanyCarousel
                title="Компании в профиле"
                items={companies}
                onRemove={removeCompany}
              />
            )}

            <CompanyPicker alreadyIds={companyIds} onAdd={addCompany} />

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
            </div>
          </div>

          <div className="submit-row">
            <button type="submit" className="profile-btn">
              Сохранить изменения
            </button>

            {message && (
              <p
                className={`form-message ${
                  message.includes("успешно") ? "success" : "error"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </section>

      <Footer />
    </div>
  );
}
