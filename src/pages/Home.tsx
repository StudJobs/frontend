import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/home-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function Home() {
  return (
    <div className="page-frame">
      <Header />
      <div className="mj-gradient-divider"></div>

      <section className="mj-hero-wrap">
        <h1 className="mj-title">MospolyJob</h1>

        <div className="mj-content-group">
          <div className="mj-hero-text">
            <p>
              <strong>MospolyJob — твой карьерный портал №1!</strong><br />
              Учишься или закончил Мосполитех? Забудь о хаосе сайтов с вакансиями — у нас собраны только предложения от партнёров твоего вуза.<br />
              Хочешь стартануть карьеру или, наоборот, найти свежие таланты в команду? Просто{" "}
              <Link to="/auth?mode=register"><u>зарегистрируйся</u></Link> или{" "}
              <Link to="/auth"><u>войди</u></Link> в свой аккаунт, заполни профиль — и твоя работа мечты
              (или идеальный сотрудник) найдётся быстрее, чем ты думаешь.
            </p>
          </div>

          <div className="mj-cards">
            <article className="mj-card mj-card--red">
              <div className="mj-card-decor">
                <img src="/src/assets/images/wave-white.png" alt="" />
              </div>
              <h3>Вакансии</h3>
              <Link className="mj-card-link" to="/vacancies">Посмотреть</Link>
            </article>

            <article className="mj-card mj-card--green">
              <div className="mj-card-decor">
                <img src="/src/assets/images/spiral.png" alt="" />
              </div>
              <h3>Кандидаты</h3>
              <a className="mj-card-link" href="#">Посмотреть</a>
            </article>

            <article className="mj-card mj-card--purple">
              <div className="mj-card-decor">
                <img src="/src/assets/images/check-long.png" alt="" />
              </div>
              <h3>Компании</h3>
              <a className="mj-card-link" href="#">Посмотреть</a>
            </article>
          </div>
        </div>

        <Footer />
      </section>
    </div>
  );
}
