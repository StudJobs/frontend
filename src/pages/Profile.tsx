import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarFallback from "../assets/images/человек.png";
import { apiGateway } from "../api/apiGateway";
import AchievementsBlock, {
  AchievementsBlockHandle,
} from "../components/profile/AchievementsBlock";
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
};

const unwrap = (resp: any) => resp?.data ?? resp;

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, "") || "";

const AVATAR_PREFIX = "user_avatar_";
const RESUME_PREFIX = "user_resume_";

const isImageExt = (s: string) => {
  const v = (s || "").toLowerCase();
  return (
    v.endsWith(".png") ||
    v.endsWith(".jpg") ||
    v.endsWith(".jpeg") ||
    v.endsWith(".webp") ||
    v.endsWith(".gif") ||
    v.endsWith(".svg") ||
    v.endsWith(".bmp") ||
    v.endsWith(".ico")
  );
};

const isImageFile = (it: AchievementItem) => {
  const fileName = (it.file_name || it.name || "").toLowerCase();
  if (isImageExt(fileName)) return true;

  const url = (it.url || "").toLowerCase();
  return (
    url.includes(".png") ||
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".webp") ||
    url.includes(".gif") ||
    url.includes(".svg") ||
    url.includes(".bmp") ||
    url.includes(".ico")
  );
};

const niceName = (it: AchievementItem) => {
  const raw = it.file_name || it.name || "Файл";
  return raw.replace(AVATAR_PREFIX, "").replace(RESUME_PREFIX, "");
};

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [docs, setDocs] = useState<AchievementItem[]>([]);

  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string>("");

  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const achievementsRef = useRef<AchievementsBlockHandle | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/auth", { replace: true });
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const resp = await apiGateway<UserProfile>({
        method: "GET",
        url: "/users/me",
      });

      const data = unwrap(resp);
      setProfile(data || null);
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      setError("Не удалось загрузить профиль. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const isAvatar = (it: AchievementItem) => {
    const id = it.id || "";
    const n = it.name || "";
    const fn = it.file_name || "";
    return (
      id.startsWith(AVATAR_PREFIX) ||
      n.startsWith(AVATAR_PREFIX) ||
      fn.startsWith(AVATAR_PREFIX)
    );
  };

  const loadFilesFromAchievements = async () => {
    try {
      const list: AchievementItem[] = await AchievementsAPI.list();

      const avatarItem = list.find(isAvatar);
      setAvatarUrl(avatarItem?.url || null);

      const nonImages = list.filter((it) => !isAvatar(it) && !isImageFile(it));

      setDocs(nonImages);
    } catch (e) {
      console.error("Ошибка загрузки файлов из achievements:", e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    loadProfile();
    loadFilesFromAchievements();
  }, [navigate]);

  const p = profile || {};
  const fullName = [p.last_name, p.first_name].filter(Boolean).join(" ");
  const hasDescription = !!p.description && p.description.trim().length > 0;

  const handleResumeButtonClick = () => {
    resumeInputRef.current?.click();
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setResumeUploading(true);
      setResumeError("");

      const fd = new FormData();
      fd.append("resume", file);

      const token = localStorage.getItem("token") || "";

      const resp = await fetch(`${API_BASE}/users/files/resume`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("Upload resume HTTP error:", resp.status, text);
        setResumeError("Не удалось загрузить резюме.");
        return;
      }

      await loadFilesFromAchievements();
    } catch (err) {
      console.error("Ошибка загрузки резюме:", err);
      setResumeError("Не удалось загрузить резюме. Попробуйте позже.");
    } finally {
      setResumeUploading(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  const handleDocDelete = async (id: string) => {
    try {
      setResumeError("");
      await AchievementsAPI.remove(id);
      await loadFilesFromAchievements();
    } catch (err) {
      console.error("Ошибка удаления файла (achievement):", err);
      setResumeError("Не удалось удалить файл. Попробуйте позже.");
    }
  };

  const tgRaw = (p.telegram || p.tg || "").trim();
  const tgShown = tgRaw
    ? tgRaw.startsWith("@")
      ? tgRaw
      : `@${tgRaw}`
    : "";
  const tgHandle = tgRaw ? tgRaw.replace("@", "") : "";

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-section">
        {loading && <p>Загрузка профиля...</p>}

        {!loading && error && (
          <div>
            <p className="profile-error">{error}</p>
            <div className="profile-buttons">
              <button className="profile-btn logout-btn" onClick={handleLogout}>
                Выйти из аккаунта
              </button>
            </div>
          </div>
        )}

        {!loading && !error && profile && (
          <>
            <div className="profile-card">
              <div className="profile-photo">
                <img src={avatarUrl || avatarFallback} alt="Фото пользователя" />
              </div>

              <div className="profile-info">
                <h2 className="profile-name">
                  {fullName || "Имя пользователя не указано"}
                </h2>

                <ul className="profile-details-list">
                  <li>
                    Возраст: {typeof p.age === "number" ? `${p.age} лет` : "—"}
                  </li>
                  <li>
                    Профиль: {p.profession_category || p.specialization || "—"}
                  </li>
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
                <p>
                  {hasDescription
                    ? p.description
                    : "Пользователь пока не заполнил описание для профиля."}
                </p>
              </div>

              <div className="profile-achievements">
                <h2>Список достижений и резюме:</h2>

                <div className="profile-resume-block">

                  {docs.length ? (
                    <div className="resume-list">
                      {docs.map((it) => (
                        <div className="resume-row" key={it.id}>
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resume-link"
                          >
                            {niceName(it)}
                          </a>

                          <button
                            type="button"
                            className="resume-delete-btn"
                            onClick={() => handleDocDelete(it.id)}
                            aria-label="Удалить файл"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Файлов пока нет.</p>
                  )}

                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    style={{ display: "none" }}
                    onChange={handleResumeChange}
                  />

                  {resumeError && <p className="profile-error">{resumeError}</p>}
                </div>

                <AchievementsBlock ref={achievementsRef} />
              </div>
            </div>

            <div className="profile-buttons">
              <button
                className="profile-btn"
                onClick={() => navigate("/profile/edit")}
              >
                Редактировать информацию
              </button>

              <button
                className="profile-btn"
                onClick={handleResumeButtonClick}
                disabled={resumeUploading}
              >
                {resumeUploading ? "Загружаем..." : "Добавить резюме или достижение"}
              </button>

              <button className="profile-btn logout-btn" onClick={handleLogout}>
                Выйти из аккаунта
              </button>
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
