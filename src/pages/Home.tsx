import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/home.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

/* ============================================================================
   Home — посадочная страница StudJobs
   --------------------------------------------------------------------------
   Структура секций:
     1. Hero — большой serif-заголовок, дескриптор, две CTA, цифры платформы
     2. Audience — три персоны (студент / HR / эксперт), карточки с CTA
     3. How it works — пошаговая схема для студента (4 шага)
     4. Features — три ключевых фичи (теги + ES, портфолио, микрозадачи)
     5. Stats strip — узкая полоса с метриками (mock: «150+ компаний», и т.д.)
     6. CTA footer — приглашение зарегистрироваться

   Дизайн: serif hero, моноширинные eyebrows для секций, тёплая тёмная база,
   янтарь как акцент. Без stock-картинок — только CSS-декорации.
   ============================================================================ */

export default function Home() {
  return (
    <div className="page-frame">
      <Header />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero__grid">
          <div className="home-hero__content">
            <span className="eyebrow sj-reveal sj-reveal-1">
              ↳ Карьерная платформа Мосполитеха
            </span>

            <h1 className="home-hero__title sj-reveal sj-reveal-2">
              Реальный <em>опыт</em>.<br />
              Подтверждённые <em>навыки</em>.<br />
              Первый <em>оффер</em>.
            </h1>

            <p className="home-hero__lead sj-reveal sj-reveal-3">
              StudJobs — место, где студенты и молодые специалисты собирают
              живое портфолио из микрозадач от компаний, получают экспертную
              верификацию каждого проекта и попадают в выдачу работодателей
              по реальным навыкам, а не пустым строкам в резюме.
            </p>

            <div className="home-hero__cta sj-reveal sj-reveal-4">
              <Link to="/auth?mode=register" className="sj-btn sj-btn--primary sj-btn--lg">
                Начать карьеру
              </Link>
              <Link to="/vacancies" className="sj-btn sj-btn--ghost sj-btn--lg">
                Смотреть вакансии
              </Link>
            </div>

            <div className="home-hero__strip sj-reveal sj-reveal-5">
              <div className="home-hero__strip-cell">
                <div className="home-hero__strip-num">9</div>
                <div className="home-hero__strip-lbl">Микросервисов в основе</div>
              </div>
              <div className="home-hero__strip-cell">
                <div className="home-hero__strip-num">150<span>+</span></div>
                <div className="home-hero__strip-lbl">IT-стеков в каталоге</div>
              </div>
              <div className="home-hero__strip-cell">
                <div className="home-hero__strip-num">~30мс</div>
                <div className="home-hero__strip-lbl">Поиск через Elasticsearch</div>
              </div>
              <div className="home-hero__strip-cell">
                <div className="home-hero__strip-num">100<span>%</span></div>
                <div className="home-hero__strip-lbl">Достижений с верификацией</div>
              </div>
            </div>
          </div>

          {/* Декор: концептуальная «карта навыков» — сетка SVG-элементов */}
          <div className="home-hero__decor" aria-hidden="true">
            <SkillGalaxy />
          </div>
        </div>
      </section>

      {/* ── AUDIENCE ─────────────────────────────────────────────────── */}
      <section className="sj-section">
        <div className="sj-container">
          <div className="sj-section-head">
            <span className="sj-section-head__eyebrow">— ДЛЯ КОГО ЭТО</span>
            <h2 className="sj-section-head__title">
              Три роли. Один общий язык — <em>навыки</em>.
            </h2>
            <p className="sj-section-head__lead">
              Платформа склеивает образовательный и индустриальный контуры.
              Каждая сторона видит ровно то, что ей нужно для следующего шага.
            </p>
          </div>

          <div className="home-roles">
            <article className="home-role">
              <div className="home-role__num">01</div>
              <div className="home-role__title">Студент</div>
              <p className="home-role__text">
                Собираешь портфолио из пет-проектов, курсовых и микрозадач.
                Каждое достижение подтверждено экспертом. Откликаешься на
                вакансии в один клик — твой стек уже виден работодателю.
              </p>
              <Link to="/auth?mode=register" className="sj-link">
                Зарегистрироваться студентом →
              </Link>
            </article>

            <article className="home-role">
              <div className="home-role__num">02</div>
              <div className="home-role__title">HR &amp; владелец компании</div>
              <p className="home-role__text">
                Публикуешь вакансии и микрозадачи с тегами стека. Получаешь
                кандидатов, у которых требуемые навыки уже верифицированы.
                Просматриваешь отклики, ведёшь решения в одном кабинете.
              </p>
              <Link to="/auth?mode=register" className="sj-link">
                Открыть кабинет компании →
              </Link>
            </article>

            <article className="home-role">
              <div className="home-role__num">03</div>
              <div className="home-role__title">Эксперт</div>
              <p className="home-role__text">
                Преподаватель или сеньор-инженер из индустрии. Заходишь в
                очередь верификации, открываешь работу студента, выносишь
                решение. Видишь, кого выпускаешь на рынок.
              </p>
              <Link to="/auth?mode=register" className="sj-link">
                Стать экспертом →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="sj-section home-how">
        <div className="sj-container">
          <div className="sj-section-head">
            <span className="sj-section-head__eyebrow">— КАК ЭТО РАБОТАЕТ</span>
            <h2 className="sj-section-head__title">Маршрут от регистрации до оффера.</h2>
          </div>

          <ol className="home-steps">
            <li className="home-step">
              <div className="home-step__mark">step.01</div>
              <h3 className="home-step__title">Заполните портфолио</h3>
              <p className="home-step__text">
                Пет-проекты, курсовые, хакатоны, курсы, ссылки на код. Привязываете
                к каждому проекту теги стека — Go, React, PostgreSQL.
              </p>
            </li>
            <li className="home-step">
              <div className="home-step__mark">step.02</div>
              <h3 className="home-step__title">Получите верификацию</h3>
              <p className="home-step__text">
                Эксперт проверяет проект и ставит «Подтверждено». Теперь это
                реальное доказательство навыка, а не строка в резюме.
              </p>
            </li>
            <li className="home-step">
              <div className="home-step__mark">step.03</div>
              <h3 className="home-step__title">Возьмите микрозадачу</h3>
              <p className="home-step__text">
                Доска задач от компаний. Сдали решение — оно проверяется HR и
                автоматически попадает в портфолио со статусом «Verified».
              </p>
            </li>
            <li className="home-step">
              <div className="home-step__mark">step.04</div>
              <h3 className="home-step__title">Откликайтесь</h3>
              <p className="home-step__text">
                Подходящие вакансии находят вас сами — поиск по тегам через
                Elasticsearch работает в обе стороны.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <div className="sj-rule" />

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="sj-section">
        <div className="sj-container">
          <div className="sj-section-head">
            <span className="sj-section-head__eyebrow">— ЧТО ВНУТРИ</span>
            <h2 className="sj-section-head__title">Технологии под капотом.</h2>
          </div>

          <div className="home-features">
            <article className="home-feature">
              <div className="mono subtle">tag.search</div>
              <h3 className="home-feature__title">Семантический поиск по стеку</h3>
              <p className="home-feature__text">
                Elasticsearch с русским анализатором. Запрос «middle Go +
                Postgres + опыт ≥ 1 год» возвращает кандидатов и вакансии
                за десятки миллисекунд.
              </p>
              <div className="home-feature__row">
                <span className="sj-skill">go</span>
                <span className="sj-skill">postgres</span>
                <span className="sj-skill">redis</span>
                <span className="sj-skill">docker</span>
              </div>
            </article>

            <article className="home-feature">
              <div className="mono subtle">portfolio.v1</div>
              <h3 className="home-feature__title">Верифицированное портфолио</h3>
              <p className="home-feature__text">
                Шесть типов достижений: пет-проект, курсовая, хакатон, курс,
                микрозадача, иное. У каждого — статус draft / pending /
                approved / rejected и подпись эксперта.
              </p>
              <div className="home-feature__row">
                <span className="status-pill status-pill--1">pending</span>
                <span className="status-pill status-pill--2">approved</span>
              </div>
            </article>

            <article className="home-feature">
              <div className="mono subtle">microtasks</div>
              <h3 className="home-feature__title">Маркетплейс реальных задач</h3>
              <p className="home-feature__text">
                Компании выкладывают мини-проекты на 1–10 часов. Студент берёт,
                сдаёт, HR ревьюит. Принятое решение автоматически становится
                верифицированной строкой в портфолио.
              </p>
              <div className="home-feature__row">
                <span className="sj-badge sj-badge--brand">
                  <span className="sj-badge__dot" /> live
                </span>
                <span className="mono subtle">apply → submit → review</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────────────────── */}
      <section className="home-cta">
        <div className="sj-container sj-container--narrow">
          <div className="home-cta__inner">
            <span className="eyebrow">— готов начать?</span>
            <h2 className="home-cta__title">
              Карьера начинается <em>сейчас</em>.
            </h2>
            <p className="home-cta__text">
              Регистрация занимает минуту. Дальше — заполняете портфолио, и
              платформа подбирает первые вакансии под ваш стек.
            </p>
            <div className="home-cta__buttons">
              <Link to="/auth?mode=register" className="sj-btn sj-btn--primary sj-btn--lg">
                Создать аккаунт
              </Link>
              <Link to="/auth" className="sj-btn sj-btn--ghost sj-btn--lg">
                У меня уже есть аккаунт
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SkillGalaxy — концептуальная декорация hero
   Сетка точек, соединённых линиями. SVG, чисто декоративно. Тёплый янтарь.
   ────────────────────────────────────────────────────────────────────────── */

function SkillGalaxy() {
  // Псевдо-случайная, но детерминированная сетка точек: 6x6 с jitter.
  const nodes: Array<{ x: number; y: number; r: number; v: boolean; lbl?: string }> = [];
  const labels = ["go", "react", "psql", "k8s", "redis", "ts", "py", "docker", "es"];
  const seed = 137;
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const jx = (rnd() - 0.5) * 14;
      const jy = (rnd() - 0.5) * 14;
      const x = 30 + col * 55 + jx;
      const y = 30 + row * 55 + jy;
      const r = 2.2 + rnd() * 2.4;
      const v = rnd() > 0.78;
      const tag = (row + col) % 3 === 0 ? labels[(row * 6 + col) % labels.length] : undefined;
      nodes.push({ x, y, r, v, lbl: tag });
    }
  }

  // Связи: соединяем близкие пары
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 70 && rnd() > 0.55) edges.push([i, j]);
    }
  }

  return (
    <svg viewBox="0 0 400 400" className="home-galaxy">
      <defs>
        <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(233, 162, 59, 0.35)" />
          <stop offset="100%" stopColor="rgba(233, 162, 59, 0)" />
        </radialGradient>
        <linearGradient id="line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(184, 179, 164, 0.05)" />
          <stop offset="50%" stopColor="rgba(184, 179, 164, 0.18)" />
          <stop offset="100%" stopColor="rgba(184, 179, 164, 0.05)" />
        </linearGradient>
      </defs>

      <circle cx="200" cy="200" r="180" fill="url(#bloom)" />

      {edges.map(([i, j], k) => (
        <line
          key={k}
          x1={nodes[i].x}
          y1={nodes[i].y}
          x2={nodes[j].x}
          y2={nodes[j].y}
          stroke="url(#line)"
          strokeWidth="1"
        />
      ))}

      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={n.v ? "#9fd649" : "#e9a23b"}
            opacity={n.v ? 0.95 : 0.78}
          >
            {i % 7 === 0 && (
              <animate
                attributeName="opacity"
                values="0.45;1;0.45"
                dur="3.6s"
                begin={`${(i % 5) * 0.3}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
          {n.lbl && (
            <text
              x={n.x + 7}
              y={n.y + 3}
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
              fill="rgba(245, 240, 227, 0.4)"
              letterSpacing="0.05em"
            >
              {n.lbl}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
