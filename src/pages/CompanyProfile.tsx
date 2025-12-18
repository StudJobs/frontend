import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarFallback from "../assets/images/человек.png";
import { apiGateway } from "../api/apiGateway";

type CompanyType = { value?: string };

type Company = {
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

const companyLocalKey = (companyId: string) => `company_local_${companyId}`;

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const isStr = (v: any) => typeof v === "string" && v.trim().length > 0;

const humanSize = (bytes: number) => {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export default function CompanyProfile() {
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [message, setMessage] = useState("");

  const [localStore, setLocalStore] = useState<LocalCompanyStorage>({
    documents: [],
  });

  useEffect(() => {
    if (!companyId) return;
    const key = companyLocalKey(companyId);
    const fromLs = safeJsonParse<LocalCompanyStorage>(localStorage.getItem(key), {
      documents: [],
    });

    setLocalStore({
      logo: fromLs.logo,
      documents: Array.isArray(fromLs.documents) ? fromLs.documents : [],
    });
  }, [companyId]);

  const writeLocal = (next: LocalCompanyStorage) => {
    if (!companyId) return;
    try {
      localStorage.setItem(companyLocalKey(companyId), JSON.stringify(next));
      setLocalStore(next);
    } catch (e) {
      console.error(e);
      setMessage("Не удалось обновить localStorage (возможно, лимит памяти).");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiGateway({ method: "GET", url: "/company/me" });
        const data: Company = (resp as any)?.data ?? resp ?? {};
        setCompany(data);

        const id = String((data as any)?.id || "");
        setCompanyId(id);
      } catch (e) {
        console.error(e);
        setMessage("Не удалось загрузить профиль компании.");
      }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/auth?mode=login", { replace: true });
  };

  const openDoc = (f: LocalStoredFile) => {
    if (!isStr(f.dataUrl)) return;
    window.open(f.dataUrl, "_blank", "noopener,noreferrer");
  };

  const deleteDoc = (fileId: string) => {
    const nextDocs = (localStore.documents || []).filter((d) => d.id !== fileId);
    writeLocal({ ...localStore, documents: nextDocs });
  };

  const logoSrc = isStr(localStore.logo?.dataUrl) ? localStore.logo!.dataUrl : avatarFallback;

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-section">
        <div className="profile-card">
          <div className="profile-photo">
            <img
              src={logoSrc}
              alt="Логотип компании"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = avatarFallback;
              }}
            />
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{company?.name || "Компания"}</h2>

            <ul className="profile-details-list">
              <li>Город: {company?.city || "—"}</li>
              <li>Сайт: {company?.site || "—"}</li>
              <li>Тип: {company?.type?.value || "—"}</li>
            </ul>

            <h3 className="profile-subtitle" style={{ marginTop: 18, fontWeight: 700 }}>
              Информация о компании:
            </h3>
            <div className="profile-about-text">
              {company?.description?.trim() ? company.description : "—"}
            </div>

            <h3 className="profile-subtitle" style={{ marginTop: 18 }}>
              Документы компании (локально):
            </h3>

            {localStore.documents?.length ? (
              <ul style={{ marginTop: 8, listStyle: "none", padding: 0 }}>
                {localStore.documents.map((f) => (
                  <li
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 10,
                      padding: "6px 0",
                      maxWidth: 560,
                    }}
                  >
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => openDoc(f)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openDoc(f);
                      }}
                      style={{
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: "0 1 auto",
                        maxWidth: 420,
                        display: "inline-block",
                      }}
                      title={f.original_name}
                    >
                      {f.original_name}
                    </span>

                    <span style={{ fontSize: 12, opacity: 0.6, whiteSpace: "nowrap" }}>
                      ({humanSize(f.size)})
                    </span>

                    <button
                      type="button"
                      aria-label={`Удалить ${f.original_name}`}
                      title="Удалить"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteDoc(f.id);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 18,
                        lineHeight: 1,
                        padding: "0 6px",
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="profile-about-text">—</div>
            )}
          </div>
        </div>

        <div className="profile-buttons">
          <button className="profile-btn" onClick={() => navigate("/company-profile/edit")}>
            Редактировать информацию
          </button>

          <button className="profile-btn logout-btn" onClick={handleLogout}>
            Выйти из аккаунта
          </button>
        </div>

        {message && (
          <p style={{ marginTop: 12, textAlign: "center", color: "#b00020" }}>
            {message}
          </p>
        )}
      </section>

      <Footer />
    </div>
  );
}
