import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/home-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import waveWhite from "../assets/images/wave-white.png";
import spiral from "../assets/images/spiral.png";
import checkLong from "../assets/images/check-long.png";

export default function Home() {
  return (
    <div className="page-frame">
      <Header />
      <div className="mj-gradient-divider"></div>

      <section className="mj-hero-wrap">
        <span className="mj-hero-eyebrow">Карьерная платформа Мосполитех</span>
        <h1 className="mj-title">StudJobs</h1>

        <div className="mj-content-group">
          <div className="mj-hero-text">
            <p>
              <strong>Карьерная платформа №1 для Мосполитеха.</strong> Вакансии и
              микрозадачи только от партнёров твоего вуза, портфолио с
              верификацией экспертов, поиск по навыкам через Elasticsearch.
            </p>
            <p>
              Хочешь стартануть карьеру или найти свежие таланты в команду?{" "}
              <Link to="/auth?mode=register">Зарегистрируйся</Link> или{" "}
              <Link to="/auth">войди</Link> — заполни профиль, подтверди навыки
              и получи первый оффер быстрее, чем ты думаешь.
            </p>
          </div>

          <div className="mj-cards">
            <article className="mj-card mj-card--red">
              <div className="mj-card-decor">
                <img src={waveWhite} alt="" />
              </div>
              <span className="mj-card-meta">Для студентов</span>
              <h3>Вакансии</h3>
              <Link className="mj-card-link" to="/vacancies">
                Посмотреть →
              </Link>
            </article>

            <article className="mj-card mj-card--green">
              <div className="mj-card-decor">
                <img src={spiral} alt="" />
              </div>
              <span className="mj-card-meta">Для HR</span>
              <h3>Кандидаты</h3>
              <Link className="mj-card-link" to="/users">
                Посмотреть →
              </Link>
            </article>

            <article className="mj-card mj-card--purple">
              <div className="mj-card-decor">
                <img src={checkLong} alt="" />
              </div>
              <span className="mj-card-meta">Партнёры вуза</span>
              <h3>Компании</h3>
              <Link className="mj-card-link" to="/companies">
                Посмотреть →
              </Link>
            </article>
          </div>

          <div className="mj-features">
            <div className="mj-feature">
              <span className="mj-feature-num">01</span>
              <h4>Микрозадачи</h4>
              <p>
                Реальные мини-проекты от компаний. Сделал — получил оплату и
                автозапись в портфолио.
              </p>
              <Link to="/tasks" className="mj-feature-link">
                К доске задач →
              </Link>
            </div>
            <div className="mj-feature">
              <span className="mj-feature-num">02</span>
              <h4>Верифицированное портфолио</h4>
              <p>
                Эксперт-преподаватель ставит «Подтверждено» на каждом проекте.
                HR видит реальные навыки, а не пустые строки.
              </p>
              <Link to="/profile" className="mj-feature-link">
                Мой профиль →
              </Link>
            </div>
            <div className="mj-feature">
              <span className="mj-feature-num">03</span>
              <h4>Поиск по стеку</h4>
              <p>
                «React + Go + Postgres» — выдача за миллисекунды через
                Elasticsearch, фильтр по уровню владения и опыту.
              </p>
              <Link to="/users" className="mj-feature-link">
                Найти кандидата →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
