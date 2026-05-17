import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { UsersAPI, UserListItem } from "../api/users";
import { directThreadRid } from "../api/chat";
import { getCurrentUserId } from "../api/apiGateway";
import { Skill, SkillsAPI } from "../api/skills";
import {
  AchievementItem,
  achievementTypeLabel,
  VERIFICATION_STATUS,
} from "../api/achievements";
import RoleBadge from "../components/ui/RoleBadge";

type LevelKind = "bronze" | "silver" | "gold" | "expert";

type Level = {
  kind: LevelKind;
  title: string;
  description: string;
  threshold: number;
};

const LEVELS: Level[] = [
  { kind: "bronze", title: "Знакомство", description: "1 верифицированный проект", threshold: 1 },
  { kind: "silver", title: "Опыт", description: "3 верифицированных проекта", threshold: 3 },
  { kind: "gold", title: "Профи", description: "5 верифицированных проектов", threshold: 5 },
  { kind: "expert", title: "Эксперт", description: "10+ верифицированных проектов", threshold: 10 },
];

const computeLevel = (verifiedCount: number): Level | null => {
  let current: Level | null = null;
  for (const lvl of LEVELS) {
    if (verifiedCount >= lvl.threshold) current = lvl;
  }
  return current;
};

export default function PublicProfile() {
  const { uuid = "" } = useParams<{ uuid: string }>();
  const [profile, setProfile] = useState<UserListItem | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [skillMap, setSkillMap] = useState<Record<string, Skill>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!uuid) return;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [user, ach] = await Promise.all([
          UsersAPI.get(uuid).catch(() => null),
          UsersAPI.listAchievements(uuid).catch(() => [] as AchievementItem[]),
        ]);

        if (cancelled) return;

        if (!user) {
          setError("Профиль не найден или скрыт владельцем.");
          setProfile(null);
          setAchievements([]);
          return;
        }

        setProfile(user);
        // Публичный профиль показывает только подтверждённые ачивки.
        // DRAFT/PENDING/REJECTED — личное дело владельца.
        setAchievements(
          (ach || []).filter(
            (a) => a.verification_status === VERIFICATION_STATUS.APPROVED
          )
        );

        const slugs = user.skill_slugs || [];
        if (slugs.length) {
          try {
            const items = await SkillsAPI.bulk(slugs);
            if (cancelled) return;
            const map: Record<string, Skill> = {};
            items.forEach((it) => {
              if (it.slug) map[it.slug] = it;
            });
            setSkillMap(map);
          } catch {
            /* пустая мапа — будут показаны slug'и */
          }
        }
      } catch (e: any) {
        console.error("PublicProfile load failed", e);
        setError("Не удалось загрузить профиль.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uuid]);

  const verifiedCount = achievements.length;
  const level = useMemo(() => computeLevel(verifiedCount), [verifiedCount]);

  const fullName =
    profile && (profile.first_name || profile.last_name)
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : "Пользователь";

  const avatar = profile?.avatar_url;
  // Инициалы для bubble-аватара (когда фото не загружено студентом).
  const initials = useMemo(() => {
    if (!profile) return "·";
    const f = (profile.first_name || "").trim();
    const l = (profile.last_name || "").trim();
    if (f || l) return (f[0] || "").toUpperCase() + (l[0] || "").toUpperCase();
    const e = (profile.email || "").trim();
    return (e[0] || "·").toUpperCase();
  }, [profile?.first_name, profile?.last_name, profile?.email]);
  // Текущая роль зрителя — нужна для условного показа кнопки «Написать» (HR/owner/expert).
  const myRole =
    typeof window !== "undefined" ? window.localStorage.getItem("role") || "" : "";
  const canMessage =
    myRole === "ROLE_EMPLOYER" ||
    myRole === "ROLE_COMPANY_OWNER" ||
    myRole === "ROLE_EXPERT";
  // На публичной странице показываем ТОЛЬКО подтверждённые навыки (verified_skill_slugs).
  // Заявленные без верификации в публику не пускаем — иначе любой набил бы себе тегов.
  const verifiedSet = useMemo(
    () => new Set(profile?.verified_skill_slugs || []),
    [profile?.verified_skill_slugs]
  );
  const skills = profile?.verified_skill_slugs || [];
  const totalSkillCount = Math.max(skills.length, 1);

  return (
    <div className="page-frame">
      <Header />
      <section className="profile-section">
        {loading ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              ⏳
            </span>
            <div className="empty-state-title">Загружаем профиль...</div>
          </div>
        ) : error ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              !
            </span>
            <div className="empty-state-title">Профиль не найден</div>
            <div className="empty-state-text">{error}</div>
            <Link to="/users" className="profile-btn">
              К списку студентов
            </Link>
          </div>
        ) : profile ? (
          <>
            {/* Header card */}
            <div className="profile-card">
              <div className="profile-photo">
                {avatar ? (
                  <img src={avatar} alt={fullName} />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(135deg, var(--brand-soft, #fce7b3) 0%, var(--surface-elev, #1f2123) 100%)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(48px, 7vw, 96px)",
                      letterSpacing: "0.04em",
                      borderRadius: "inherit",
                    }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <h1 className="profile-name">{fullName}</h1>
                  <RoleBadge role={profile.role} />
                  {level ? (
                    <span
                      className={`level-badge level-badge--${level.kind}`}
                      title={level.description}
                    >
                      <span className="level-badge-icon" aria-hidden="true" />
                      {level.title}
                    </span>
                  ) : null}
                </div>

                {profile.profession_category || profile.specialization ? (
                  <div
                    style={{
                      color: "var(--fg-muted)",
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {[profile.profession_category, profile.specialization]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                ) : null}

                {profile.education_institution ? (
                  <div
                    style={{
                      color: "var(--fg-subtle)",
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    {profile.education_institution}
                  </div>
                ) : null}

                {profile.description ? (
                  <p
                    style={{
                      color: "var(--fg-muted)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginTop: 16,
                      maxWidth: 720,
                    }}
                  >
                    {profile.description}
                  </p>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    marginTop: 20,
                  }}
                >
                  <Stat label="Подтверждённых проектов" value={verifiedCount} />
                  <Stat label="Навыков" value={skills.length} />
                </div>

                {canMessage && profile.id ? (
                  <div
                    style={{
                      marginTop: 18,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      className="sj-btn sj-btn--primary"
                      to={(() => {
                        const me = getCurrentUserId();
                        if (!me || !profile.id) return `/messages?peer=${encodeURIComponent(profile.id || "")}`;
                        const rid = directThreadRid(me, profile.id);
                        return `/messages?thread=direct:${encodeURIComponent(rid)}`;
                      })()}
                      style={{
                        textDecoration: "none",
                        padding: "10px 18px",
                        borderRadius: 12,
                        fontWeight: 700,
                        background: "var(--brand)",
                        color: "var(--ink-on-brand)",
                      }}
                    >
                      ✉ Написать студенту
                    </Link>
                    {profile.tg ? (
                      <a
                        href={`https://t.me/${profile.tg.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="sj-btn sj-btn--ghost"
                        style={{
                          textDecoration: "none",
                          padding: "10px 16px",
                          borderRadius: 12,
                          fontWeight: 700,
                          border: "1px solid var(--border)",
                          color: "var(--ink)",
                        }}
                      >
                        Telegram · {profile.tg}
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {profile.resume_url ? (
                  <div style={{ marginTop: 16 }}>
                    <a
                      className="profile-btn"
                      href={profile.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Скачать резюме
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Skill graph */}
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  marginBottom: 12,
                }}
              >
                Стек навыков
              </h2>
              {skills.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon" aria-hidden="true">
                    +
                  </span>
                  <div className="empty-state-title">
                    Навыки ещё не указаны
                  </div>
                  <div className="empty-state-text">
                    Когда студент добавит компетенции, они появятся здесь —
                    с зелёной подсветкой для верифицированных.
                  </div>
                </div>
              ) : (
                <div className="skill-graph">
                  {skills.map((slug) => {
                    const meta = skillMap[slug];
                    const verified = verifiedSet.has(slug);
                    const widthPct = verified ? 100 : 12;
                    return (
                      <div
                        key={slug}
                        className={
                          verified
                            ? "skill-graph-cell skill-graph-cell--verified"
                            : "skill-graph-cell"
                        }
                      >
                        <span className="skill-graph-name">
                          {meta?.name || slug}
                        </span>
                        <span className="skill-graph-count">
                          {verified ? "Подтверждено" : "Без верификации"}
                          {totalSkillCount > 0 ? ` · ${verifiedCount}` : ""}
                        </span>
                        <span className="skill-graph-bar">
                          <span
                            className="skill-graph-bar-fill"
                            style={{ width: `${widthPct}%` }}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Achievements grid */}
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  marginBottom: 12,
                }}
              >
                Подтверждённые проекты ({verifiedCount})
              </h2>
              {verifiedCount === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon" aria-hidden="true">
                    ☐
                  </span>
                  <div className="empty-state-title">
                    Подтверждённых проектов ещё нет
                  </div>
                  <div className="empty-state-text">
                    После того как эксперт одобрит первый проект из портфолио
                    или HR закроет микрозадачу, бейдж появится здесь.
                  </div>
                </div>
              ) : (
                <ul className="achievements-list">
                  {achievements.map((a) => {
                    const isLink = !!a.url;
                    const Body = (
                      <>
                        <span className="achievement-link">
                          {a.name || a.file_name}
                        </span>
                        {typeof a.type === "number" && a.type > 0 ? (
                          <span className="type-badge">
                            {achievementTypeLabel(a.type)}
                          </span>
                        ) : null}
                        <span className="v-badge v-badge--approved">
                          Подтверждено
                        </span>
                      </>
                    );
                    return (
                      <li key={a.id} className="achievement-item">
                        {isLink ? (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "contents",
                              textDecoration: "none",
                            }}
                          >
                            {Body}
                          </a>
                        ) : (
                          Body
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </section>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--fg)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
