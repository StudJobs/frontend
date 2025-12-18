import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-edit-mospolyjob.css";
import "../assets/styles/profile-hr-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarFallback from "../assets/images/человек.png";
import { apiGateway } from "../api/apiGateway";

type CompanyType = { value?: string };

type CompanyProfile = {
  id?: string;
  name?: string;
  city?: string;
  site?: string;
  description?: string;
  type?: CompanyType;
};

type LocalStoredFile = {
  id: string;
  original_name: string;
  mime: string;
  size: number;
  dataUrl: string;
  created_at: number;
};

type LocalCompanyStorage = {
  logo?: {
    original_name: string;
    mime: string;
    size: number;
    dataUrl: string;
    created_at: number;
  };
  documents: LocalStoredFile[];
};

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

const makeId = () =>
  (crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random()}`).toString();

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// лимиты — чтобы localStorage не умер
const MAX_LOGO_MB = 2;
const MAX_DOC_MB = 2;
const MAX_DOCS_COUNT = 20;

const humanSize = (bytes: number) => {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export default function CompanyProfileEdit() {
  const navigate = useNavigate();

  const [company, setCompany] = useState<CompanyProfile>({
    name: "",
    city: "",
    site: "",
    description: "",
    type: { value: "" },
  });

  const [companyId, setCompanyId] = useState("");

  const [photo, setPhoto] = useState<string>(avatarFallback);
  const [localDocs, setLocalDocs] = useState<LocalStoredFile[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  const readLocal = (id: string): LocalCompanyStorage => {
    return safeJsonParse<LocalCompanyStorage>(
      localStorage.getItem(companyLocalKey(id)),
      { documents: [] }
    );
  };

  const writeLocal = (id: string, next: LocalCompanyStorage) => {
    try {
      localStorage.setItem(companyLocalKey(id), JSON.stringify(next));
    } catch (e) {
      console.error(e);
      setMessage({
        ok: false,
        text:
          "Не удалось сохранить (скорее всего лимит памяти). Удали пару файлов и попробуй снова.",
      });
    }
  };

  const syncFromLocal = (id: string) => {
    const stored = readLocal(id);
    setPhoto(isStr(stored.logo?.dataUrl) ? stored.logo!.dataUrl : avatarFallback);
    setLocalDocs(Array.isArray(stored.documents) ? stored.documents : []);
  };

  const loadCompany = async () => {
    const resp = await apiGateway({ method: "GET", url: "/company/me" });
    const data: any = (resp as any)?.data ?? resp ?? {};
    const id = String(data?.id || "");
    setCompanyId(id);

    setCompany({
      id: data?.id,
      name: data?.name || "",
      city: data?.city || "",
      site: data?.site || "",
      description: data?.description || "",
      type: data?.type?.value ? { value: data.type.value } : { value: "" },
    });

    if (id) syncFromLocal(id);
    else {
      setPhoto(avatarFallback);
      setLocalDocs([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadCompany();
      } catch (e) {
        console.error(e);
        setMessage({ ok: false, text: "Не удалось загрузить данные компании." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (companyId) syncFromLocal(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!companyId) {
      setMessage({
        ok: false,
        text: "Нет ID компании — нельзя сохранить логотип.",
      });
      return;
    }

    const mb = file.size / 1024 / 1024;
    if (mb > MAX_LOGO_MB) {
      setMessage({
        ok: false,
        text: `Логотип слишком большой (${mb.toFixed(2)}MB). Макс ${MAX_LOGO_MB}MB.`,
      });
      return;
    }

    try {
      setMessage(null);
      const dataUrl = await readAsDataUrl(file);

      if (isStr(dataUrl)) setPhoto(dataUrl);

      const prev = readLocal(companyId);

      const next: LocalCompanyStorage = {
        ...prev,
        logo: {
          original_name: file.name,
          mime: file.type || "image/*",
          size: file.size,
          dataUrl,
          created_at: Date.now(),
        },
      };

      writeLocal(companyId, next);
      syncFromLocal(companyId);

      setMessage({ ok: true, text: "Логотип сохранён." });
    } catch (e) {
      console.error(e);
      setMessage({ ok: false, text: "Не удалось прочитать файл логотипа." });
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!companyId) {
      setMessage({
        ok: false,
        text: "Нет ID компании — нельзя сохранить документ.",
      });
      return;
    }

    const mb = file.size / 1024 / 1024;
    if (mb > MAX_DOC_MB) {
      setMessage({
        ok: false,
        text: `Файл слишком большой (${mb.toFixed(2)}MB). Макс ${MAX_DOC_MB}MB.`,
      });
      return;
    }

    try {
      setMessage(null);
      const dataUrl = await readAsDataUrl(file);

      const prev = readLocal(companyId);
      const docs = Array.isArray(prev.documents) ? prev.documents : [];

      if (docs.length >= MAX_DOCS_COUNT) {
        setMessage({
          ok: false,
          text: `Слишком много документов (макс ${MAX_DOCS_COUNT}). Удали старые.`,
        });
        return;
      }

      const nextDoc: LocalStoredFile = {
        id: makeId(),
        original_name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        created_at: Date.now(),
      };

      const next: LocalCompanyStorage = {
        ...prev,
        documents: [nextDoc, ...docs],
      };

      writeLocal(companyId, next);
      setLocalDocs(next.documents);

      setMessage({ ok: true, text: "Документ сохранён." });
    } catch (e) {
      console.error(e);
      setMessage({ ok: false, text: "Не удалось прочитать файл документа." });
    }
  };

  const openLocalDoc = (doc: LocalStoredFile) => {
    if (!isStr(doc.dataUrl)) return;
    window.open(doc.dataUrl, "_blank", "noopener,noreferrer");
  };

  const deleteLocalDoc = (docId: string) => {
    if (!companyId) return;

    const prev = readLocal(companyId);
    const docs = Array.isArray(prev.documents) ? prev.documents : [];

    const nextDocs = docs.filter((d) => d.id !== docId);
    const next: LocalCompanyStorage = { ...prev, documents: nextDocs };

    writeLocal(companyId, next);
    setLocalDocs(nextDocs);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setMessage(null);

      await apiGateway({
        method: "PATCH",
        url: "/company",
        data: {
          id: company.id,
          name: company.name || "",
          city: company.city || "",
          site: company.site || "",
          description: company.description || "",
          type: { value: company.type?.value || "" },
        },
      });

      navigate("/company-profile", { replace: true });
    } catch (e) {
      console.error(e);
      setMessage({
        ok: false,
        text: "Не удалось сохранить изменения (текстовые поля).",
      });
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-edit-section">
        <h2 className="edit-title">Редактирование компании</h2>

        <form className="edit-form" onSubmit={handleSave}>
          <div className="photo-upload">
            <img
              src={photo}
              alt="Логотип компании"
              className="profile-preview-rect"
              onError={(e) =>
                ((e.currentTarget as HTMLImageElement).src = avatarFallback)
              }
            />

            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              style={{ display: "none" }}
            />

            <label htmlFor="logo-upload" className="upload-btn">
              Изменить логотип
            </label>
          </div>

          <h3 className="subsection-title">Информация о компании</h3>

          <div className="form-row">
            <div className="form-field">
              <label className="label-title">Название</label>
              <input
                value={company.name || ""}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="form-field">
              <label className="label-title">Город</label>
              <input
                value={company.city || ""}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, city: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="label-title">Сайт</label>
              <input
                value={company.site || ""}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, site: e.target.value }))
                }
              />
            </div>

            <div className="form-field">
              <label className="label-title">Тип компании</label>
              <input
                value={company.type?.value || ""}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, type: { value: e.target.value } }))
                }
              />
            </div>
          </div>

          <h3 className="subsection-title">Описание</h3>
          <div className="form-field">
            <textarea
              value={company.description || ""}
              onChange={(e) =>
                setCompany((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          <div className="form-field" style={{ marginTop: 12 }}>
            <label className="label-title">Документы компании (локально)</label>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleDocUpload}
            />

            <div className="profile-about-text" style={{ marginTop: 6 }}>
              Лимит: {MAX_DOC_MB}MB на файл, до {MAX_DOCS_COUNT} файлов.
            </div>

            {localDocs.length > 0 && (
              <ul style={{ marginTop: 10, listStyle: "none", padding: 0 }}>
                {localDocs.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 0",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => openLocalDoc(d)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openLocalDoc(d);
                      }}
                      style={{
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontWeight: 700, // ✅ жирным
                        maxWidth: 520,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                      title={d.original_name}
                    >
                      {d.original_name}
                    </span>

                    <span style={{ fontSize: 12, opacity: 0.6 }}>
                      ({humanSize(d.size)})
                    </span>

                    <button
                      type="button"
                      aria-label="Удалить"
                      onClick={() => deleteLocalDoc(d.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 18,
                        lineHeight: 1,
                        padding: "0 6px",
                      }}
                      title="Удалить"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="submit-row">
            <button type="submit" className="profile-btn">
              Сохранить изменения
            </button>
          </div>

          {message?.text && (
            <p
              className={`form-message ${message.ok ? "success" : "error"}`}
              style={{ marginTop: 10 }}
            >
              {message.text}
            </p>
          )}
        </form>
      </section>

      <Footer />
    </div>
  );
}
