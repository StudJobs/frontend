import React, { useEffect, useState } from "react";
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

const unwrap = (resp: any) => resp?.data ?? resp ?? {};

export default function ProfileHRFull() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const vacancies = [
    { id: 1, title: "Вакансия 1", color: "red", decor: wave },
    { id: 2, title: "Вакансия 2", color: "green", decor: spiral },
    { id: 3, title: "Вакансия 3", color: "purple", decor: checkLong },
  ];

  const companies = [
    { id: 1, title: "Компания 1", color: "green", decor: spiral },
    { id: 2, title: "Компания 2", color: "purple", decor: checkLong },
    { id: 3, title: "Компания 3", color: "red", decor: wave },
  ];

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

        const resp = await apiGateway({
          method: "GET",
          url: "/users/me",
        });

        const data: UserProfile = unwrap(resp);
        setProfile(data);
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
        <div className="profile-card">
          <div className="profile-photo">
            <img src={avatarFallback} alt="Фото HR" />
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{loading ? "Загрузка..." : fullName}</h2>

            <ul className="profile-details-list">
              <li>Возраст: {typeof p.age === "number" ? `${p.age} лет` : "—"}</li>
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
        </div>

        <div className="profile-buttons">
          <button className="profile-btn">Добавить вакансию</button>
          <button className="profile-btn">Добавить компанию</button>
          <button
            className="profile-btn"
            onClick={() => navigate("/hr-profile/edit")}
          >
            Редактировать информацию
          </button>
          <button onClick={handleLogout} className="profile-btn logout-btn">
            Выйти из аккаунта
          </button>
        </div>

        <div className="hr-section">
          <h3>Список доступных вакансий, оставленных пользователем:</h3>
          <div className="hr-cards">
            {vacancies.map((vac) => (
              <article key={vac.id} className={`hr-card hr-card--${vac.color}`}>
                <div className="hr-card-decor">
                  <img src={vac.decor} alt="" />
                </div>
                <h3>{vac.title}</h3>
                <a href="#" className="hr-card-link">
                  Посмотреть
                </a>
              </article>
            ))}
          </div>
        </div>

        <div className="hr-section">
          <h3>Компании, в которых числится HR:</h3>
          <div className="hr-cards">
            {companies.map((comp) => (
              <article key={comp.id} className={`hr-card hr-card--${comp.color}`}>
                <div className="hr-card-decor">
                  <img src={comp.decor} alt="" />
                </div>
                <h3>{comp.title}</h3>
                <a href="#" className="hr-card-link">
                  Посмотреть
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
