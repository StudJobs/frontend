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
import SkillBadges from "../components/ui/SkillBadges";
import Onboarding from "../components/profile/Onboarding";

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
  education_institution?: string;
  github?: string;
  skill_slugs?: string[];
  verified_skill_slugs?: string[];
};

const unwrap = (resp: any) => resp?.data ?? resp;

const AVATAR_PREFIX = "user_avatar_";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const achievementsRef = useRef<AchievementsBlockHandle | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);

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

      // Onboarding: показать визард, если профиль "пустой" (нет имени)
      // и юзер ещё не дисмиссил его в этой сессии устройства.
      const dismissed = localStorage.getItem("onboarding_dismissed") === "1";
      const isEmpty = !data?.first_name && !data?.last_name;
      if (isEmpty && !dismissed) {
        setShowOnboarding(true);
      }
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

  const loadAvatar = async () => {
    try {
      const list: AchievementItem[] = await AchievementsAPI.list();
      const avatarItem = list.find(isAvatar);
      setAvatarUrl(avatarItem?.url || null);
    } catch (e) {
      console.error("Ошибка загрузки аватара:", e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }
    loadProfile();
    loadAvatar();
  }, [navigate]);

  const p = profile || {};
  const fullName = [p.last_name, p.first_name].filter(Boolean).join(" ");
  const hasDescription = !!p.description && p.description.trim().length > 0;

  const handleAddAchievementClick = () => {
    // Делегируем загрузку в AchievementsBlock: там выбирается тип через dropdown,
    // файл сохраняется через /user/achievements с типом, появляется кнопка
    // «На проверку». Отдельный resume-flow (без типа) больше не используется.
    achievementsRef.current?.openFileDialog();
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
                  <li>
                    Учебное заведение: {p.education_institution || "—"}
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
                    <li>
                      GitHub:{" "}
                      {p.github ? (
                        <a
                          href={
                            /^https?:\/\//i.test(p.github)
                              ? p.github
                              : `https://github.com/${p.github.replace(/^@/, "")}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {p.github}
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

              <div className="profile-about" style={{ marginTop: 16 }}>
                <h2 className="profile-about-title">Навыки:</h2>
                {(() => {
                  const verified = p.verified_skill_slugs || [];
                  const declared = (p.skill_slugs || []).filter((s) => !verified.includes(s));
                  return (
                    <>
                      {verified.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                            Подтверждено экспертом или микрозадачей
                          </div>
                          <SkillBadges slugs={verified} variant="verified" />
                        </div>
                      )}
                      {declared.length > 0 && (
                        <div>
                          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                            Заявлено вами (не подтверждено). Для подтверждения завершите микрозадачу с этим навыком
                            или пройдите квест от эксперта.
                          </div>
                          <SkillBadges slugs={declared} variant="neutral" />
                        </div>
                      )}
                      {verified.length === 0 && declared.length === 0 && (
                        <SkillBadges slugs={[]} />
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="profile-achievements">
                <h2>Список достижений и резюме:</h2>
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
                onClick={handleAddAchievementClick}
              >
                Добавить достижение
              </button>

              <button
                className="profile-btn"
                onClick={() => navigate("/my/applications")}
              >
                Мои отклики
              </button>

              <button className="profile-btn logout-btn" onClick={handleLogout}>
                Выйти из аккаунта
              </button>
            </div>
          </>
        )}
      </section>

      {showOnboarding ? (
        <Onboarding
          initialFirstName={p.first_name}
          initialLastName={p.last_name}
          onClose={() => {
            localStorage.setItem("onboarding_dismissed", "1");
            setShowOnboarding(false);
          }}
          onCompleted={() => {
            localStorage.setItem("onboarding_dismissed", "1");
            setShowOnboarding(false);
            loadProfile();
          }}
        />
      ) : null}

      <Footer />
    </div>
  );
}
