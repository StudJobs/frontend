/*Страница сырая, нет отсылок к бэку. Хочу добавить автоподстановку данных из бэка*/
import React, { useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/profile-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import editIcon from "../assets/images/карандаш.png";
import deleteIcon from "../assets/images/корзина.png";
import avatar from "../assets/images/человек.png";

export default function Profile() {
  const [files, setFiles] = useState([
    { id: 1, name: "Файл 1.pdf" },
    { id: 2, name: "Файл2.docx" },
  ]);

  const [description, setDescription] = useState("");

  const handleDelete = (id: number) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleLogout = () => {
    alert("Вы вышли из аккаунта");
    // позже добавить очистку токена и navigate("/auth")
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-section">
        <div className="profile-card">
          <div className="profile-photo">
            <img src={avatar} alt="Фото пользователя" />
          </div>

          <div className="profile-info">
            <h2 className="profile-name">Пупкин Абдурахман Валентинович</h2>

            <ul className="profile-details-list">
                <li>Возраст: 20 лет</li>
                <li>Пол: Мужской</li>
                <li>Город: Москва</li>
                <li>Опыт работы: 3 года</li>
                <li>Курс: Первый</li>
                <li>Профиль: АСОИУ</li>
                <li>Уровень образования: Среднее</li>
                <li>Форма обучения: Очная</li>
            </ul>

            <div className="profile-contacts">
            <strong>Контакты:</strong>
            <ul className="profile-contacts-list">
                <li>+7 (495) 223-05-23</li>
                <li>mospolytech@mospolytech.ru</li>
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

        <div className="profile-files">
          <h3>Список достижений и резюме:</h3>
          <ul>
            {files.map((file) => (
              <li key={file.id}>
                <a href="#" className="file-link">
                  {file.name}
                </a>
                <img
                  src={editIcon}
                  alt="Редактировать"
                  className="file-icon"
                  onClick={() => alert(`Редактировать ${file.name}`)}
                />
                <img
                  src={deleteIcon}
                  alt="Удалить"
                  className="file-icon"
                  onClick={() => handleDelete(file.id)}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="profile-buttons">
          <button className="profile-btn">Редактировать информацию</button>
          <button className="profile-btn">Добавить достижения</button>
          <button onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("role");
                  window.location.href = "/auth";
                }} className="profile-btn logout-btn">
            Выйти из аккаунта
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
