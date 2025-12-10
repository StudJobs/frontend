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
import {
  AchievementsAPI,
  AchievementItem,
} from "../api/achievements";

type UserProfile = {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  age?: number;
  gender?: string;
  city?: string;
  course?: string;
  specialization?: string;
  education_level?: string;
  university?: string;
  experience?: string;
  phone?: string;
  email?: string;
  tg?: string;
  description?: string;
};

const unwrap = (resp: any) => resp?.data ?? resp;

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, "") || "";

const AVATAR_PREFIX = "user_avatar_";
const RESUME_PREFIX = "user_resume_";

type ResumeInfo = {
  id: string;
  name: string;
  url: string;
} | null;

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeInfo>(null);
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

  const isResume = (it: AchievementItem) => {
    const id = it.id || "";
    const n = it.name || "";
    const fn = it.file_name || "";
    return (
      id.startsWith(RESUME_PREFIX) ||
      n.startsWith(RESUME_PREFIX) ||
      fn.startsWith(RESUME_PREFIX)
    );
  };

  const loadFilesFromAchievements = async () => {
    try {
      const list: AchievementItem[] = await AchievementsAPI.list();

      const avatarItem = list.find(isAvatar);
      if (avatarItem?.url) {
        setAvatarUrl(avatarItem.url);
      }

      const resumeItem = list.find(isResume);
      if (resumeItem?.url) {
        const rawName =
          resumeItem.file_name || resumeItem.name || "Резюме";
        const niceName = rawName.replace(RESUME_PREFIX, "");
        setResume({
          id: resumeItem.id,
          name: niceName || "Резюме",
          url: resumeItem.url,
        });
      } else {
        setResume(null);
      }
    } catch (e) {
      console.error("Ошибка загрузки аватара/резюме из achievements:", e);
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
  const fullName = [p.last_name, p.first_name, p.middle_name]
    .filter(Boolean)
    .join(" ");

  const hasDescription = !!p.description && p.description.trim().length > 0;

  const handleResumeButtonClick = () => {
    resumeInputRef.current?.click();
  };

  const handleResumeChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

  const handleResumeDelete = async () => {
    if (!resume?.id) return;

    try {
      setResumeError("");
      await AchievementsAPI.remove(resume.id);
      setResume(null);
    } catch (err) {
      console.error("Ошибка удаления резюме (achievement):", err);
      setResumeError("Не удалось удалить резюме. Попробуйте позже.");
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-section">
        {loading && <p>Загрузка профиля...</p>}

        {!loading && error && (
          <div>
            <p className="profile-error">{error}</p>
            <div className="profile-buttons">
              <button
                className="profile-btn logout-btn"
                onClick={handleLogout}
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>
        )}

        {!loading && !error && profile && (
          <>
            <div className="profile-card">
              <div className="profile-photo">
                <img
                  src={avatarUrl || avatarFallback}
                  alt="Фото пользователя"
                />
              </div>

              <div className="profile-main-info">
                <h1 className="profile-name">
                  {fullName || "Имя пользователя не указано"}
                </h1>

                <ul className="profile-main-list">
                  <li>Возраст: {p.age ? `${p.age} лет` : "не указан"}</li>
                  <li>Пол: {p.gender || "не указан"}</li>
                  <li>Город: {p.city || "не указан"}</li>
                  <li>Опыт работы: {p.experience || "не указан"}</li>
                  <li>Курс: {p.course || "не указан"}</li>
                  <li>Профиль: {p.specialization || "АСОИУ"}</li>
                  <li>
                    Уровень образования: {p.education_level || "не указан"}
                  </li>
                  <li>Форма обучения: {p.university || "не указана"}</li>
                </ul>

                <div className="profile-contacts-block">
                  <p className="profile-contacts-title">Контакты:</p>
                  <ul className="profile-main-list">
                    <li>{p.phone || "Телефон не указан"}</li>
                    <li>{p.email || "E-mail не указан"}</li>
                    {p.tg && (
                      <li>
                        Telegram:{" "}
                        <a
                          href={`https://t.me/${p.tg.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {p.tg}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="profile-bottom-block">
              <div className="profile-about">
                <h2>О себе:</h2>
                <p>
                  {hasDescription
                    ? p.description
                    : "Пользователь пока не заполнил описание для профиля."}
                </p>
              </div>

              <div className="profile-achievements">
                <h2>Список достижений и резюме:</h2>

                <div className="profile-resume-block">
                  <p>Резюме:</p>
                  {resume ? (
                    <div className="resume-row">
                      <a
                        href={resume.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resume-link"
                      >
                        {resume.name}
                      </a>
                      <button
                        type="button"
                        className="resume-delete-btn"
                        onClick={handleResumeDelete}
                        aria-label="Удалить резюме"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <p>Резюме не загружено.</p>
                  )}

                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    style={{ display: "none" }}
                    onChange={handleResumeChange}
                  />

                  {resumeError && (
                    <p className="profile-error">{resumeError}</p>
                  )}
                </div>

                <AchievementsBlock ref={achievementsRef} />
              </div>
            </div>

            {/* нижние большие кнопки */}
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
                {resumeUploading
                  ? "Загружаем резюме..."
                  : "Загрузить резюме"}
              </button>

              <button
                className="profile-btn"
                onClick={() => achievementsRef.current?.openFileDialog()}
              >
                Добавить достижения
              </button>

              <button
                className="profile-btn logout-btn"
                onClick={handleLogout}
              >
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
