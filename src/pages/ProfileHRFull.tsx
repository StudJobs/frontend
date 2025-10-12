/*Страница сырая, нет отсылок к бэку. Хочу добавить автоподстановку данных из бэка*/
import React, { useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/profile-hr-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatar from "../assets/images/человек.png";
import wave from "../assets/images/wave-white.png";
import spiral from "../assets/images/spiral.png";
import checkLong from "../assets/images/check-long.png";

export default function ProfileHRFull() {
  const [description, setDescription] = useState("");

  const handleLogout = () => {
    alert("Вы вышли из аккаунта");
    // позже добавить очистку токена и navigate("/auth")
  };

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

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-section">
        <div className="profile-card">
          <div className="profile-photo">
            <img src={avatar} alt="Фото HR" />
          </div>

          <div className="profile-info">
            <h2 className="profile-name">Сидорова Анна Владимировна</h2>

            <ul className="profile-details-list">
              <li>Возраст: 29 лет</li>
              <li>Пол: Женский</li>
              <li>Город: Москва</li>
              <li>Должность: HR-менеджер</li>
              <li>Опыт работы: 6 лет</li>
              <li>Профиль: Кадровое управление</li>
              <li>Уровень образования: Магистратура</li>
            </ul>

            <div className="profile-contacts">
              <strong>Контакты:</strong>
              <ul className="profile-contacts-list">
                <li>+7 (495) 444-11-22</li>
                <li>anna.sidorova@techline.ru</li>
              </ul>
            </div>

            <div className="profile-description">
              <strong>О себе:</strong>
              <p>
                {description.trim()
                  ? description
                  : "Пользователь поленился оставить описание для профиля... В 1800-х годах, в те времена, когда не было еще ни железных, ни шоссейных дорог, ни газового, ни стеаринового света, ни пружинных низких диванов, ни мебели без лаку, ни разочарованных юношей со стеклышками, ни либеральных философов-женщин, ни милых дам-камелий, которых так много развелось в наше время, - в те наивные времена, когда из Москвы, выезжая в Петербург в повозке или карете, брали с собой целую кухню домашнего приготовления, ехали восемь суток по мягкой, пыльной или грязной дороге и верили в пожарские котлеты, в валдайские колокольчики и бублики, - когда в длинные осенние вечера нагорали сальные свечи, освещая семейные кружки из двадцати и тридцати человек, на балах в канделябры вставлялись восковые и спермацетовые свечи, когда мебель ставили симметрично, когда наши отцы были еще молоды не одним отсутствием морщин и седых волос, а стрелялись за женщин и из другого угла комнаты бросались поднимать нечаянно и не нечаянно уроненные платочки, наши матери носили коротенькие талии и огромные рукава и решали семейные дела выниманием билетиков, когда прелестные дамы-камелии прятались от дневного света, - в наивные времена масонских лож, мартинистов, тугендбунда, во времена Милорадовичей, Давыдовых, Пушкиных, - в губернском городе К. был съезд помещиков, и кончались дворянские выборы."}
              </p>
            </div>
          </div>
        </div>

        <div className="profile-buttons">
          <button className="profile-btn">Добавить вакансию</button>
          <button className="profile-btn">Добавить компанию</button>
          <button className="profile-btn">Редактировать информацию</button>
          <button onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("role");
                  window.location.href = "/auth";
                }}className="profile-btn logout-btn">
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
