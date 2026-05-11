import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";
import "./Header.css";

/* ============================================================================
   Header (sticky, role-aware)
   --------------------------------------------------------------------------
   Структура:
     [Бренд]   [Главные nav-ссылки (зависят от роли)]    [Bell] [Avatar]

   Логика ролей:
     - анонимный → «Вход» CTA + ссылки «Вакансии», «Компании», «О платформе»
     - ROLE_STUDENT → «Лента», «Вакансии», «Микрозадачи», «Портфолио»
     - ROLE_EMPLOYER → «Кабинет», «Вакансии», «Микрозадачи», «Отклики»
     - ROLE_COMPANY_OWNER → «Компания», «Микрозадачи»
     - ROLE_EXPERT → «Очередь»
   ============================================================================ */

type NavItem = { to: string; label: string; mark?: string };

function getRole(): string | null {
  try {
    return localStorage.getItem("role");
  } catch {
    return null;
  }
}

function getInitials(): string {
  try {
    const raw = localStorage.getItem("me") || localStorage.getItem("user") || "";
    if (!raw) return "СТ";
    const u = JSON.parse(raw);
    const name = (u?.first_name || u?.name || u?.email || "").toString();
    if (!name) return "СТ";
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  } catch {
    return "СТ";
  }
}

function navForRole(role: string | null): NavItem[] {
  switch (role) {
    case "ROLE_STUDENT":
      return [
        { to: "/vacancies", label: "Вакансии" },
        { to: "/tasks", label: "Микрозадачи" },
        { to: "/profile", label: "Портфолио" },
        { to: "/my/applications", label: "Отклики" },
      ];
    case "ROLE_EMPLOYER":
      return [
        { to: "/hr", label: "Кабинет" },
        { to: "/hr-profile", label: "Мои вакансии" },
        { to: "/hr/tasks", label: "Микрозадачи" },
        { to: "/users", label: "Кандидаты" },
      ];
    case "ROLE_COMPANY_OWNER":
    case "ROLE_COMPANY":
      return [
        { to: "/hr", label: "Кабинет" },
        { to: "/company-profile", label: "Компания" },
        { to: "/hr/tasks", label: "Микрозадачи" },
      ];
    case "ROLE_EXPERT":
      return [
        { to: "/expert", label: "Очередь верификации", mark: "EXP" },
      ];
    default:
      return [
        { to: "/vacancies", label: "Вакансии" },
        { to: "/companies", label: "Компании" },
        { to: "/users", label: "Каталог" },
      ];
  }
}

function profileTargetForRole(role: string | null): string {
  switch (role) {
    case "ROLE_EMPLOYER":
    case "ROLE_COMPANY_OWNER":
    case "ROLE_COMPANY":
      return "/hr";
    case "ROLE_EXPERT":
      return "/expert";
    case "ROLE_STUDENT":
      return "/profile";
    default:
      return "/auth";
  }
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(getRole());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Подхватываем изменения роли (логин/логаут в другой вкладке) — слушаем storage.
  useEffect(() => {
    const onStorage = () => setRole(getRole());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // На каждом изменении маршрута перечитываем роль (юзер мог залогиниться/выйти).
  useEffect(() => {
    setRole(getRole());
  }, [location.pathname]);

  // Закрываем меню при клике вне.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const isAuth = !!role;
  const initials = useMemo(() => getInitials(), [role]);
  const items = useMemo(() => navForRole(role), [role]);

  function handleLogout() {
    try {
      localStorage.clear();
    } catch {
      /* noop */
    }
    setMenuOpen(false);
    navigate("/auth", { replace: true });
  }

  return (
    <header className="sj-header">
      <div className="sj-header__inner">
        {/* Бренд */}
        <button
          type="button"
          className="sj-brand"
          onClick={() => navigate("/")}
          aria-label="StudJobs — главная"
        >
          <span className="sj-brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 10l12-6 12 6-12 6L4 10z" />
              <path d="M4 16l12 6 12-6" />
              <path d="M4 22l12 6 12-6" opacity="0.4" />
            </svg>
          </span>
          <span className="sj-brand__text">
            <span className="sj-brand__name">StudJobs</span>
            <span className="sj-brand__sub">Мосполитех</span>
          </span>
        </button>

        {/* Главная навигация */}
        <nav className="sj-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                "sj-nav__link" + (isActive ? " sj-nav__link--active" : "")
              }
            >
              {item.mark && <span className="sj-nav__mark">{item.mark}</span>}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Правая часть: уведомления + меню юзера */}
        <div className="sj-header__right">
          {isAuth ? (
            <>
              <NotificationsBell />

              <div className="sj-usermenu" ref={menuRef}>
                <button
                  type="button"
                  className="sj-avatar"
                  onClick={() => setMenuOpen((s) => !s)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {initials}
                </button>
                {menuOpen && (
                  <div className="sj-usermenu__dropdown" role="menu">
                    <div className="sj-usermenu__head">
                      <div className="sj-usermenu__role">{roleLabel(role)}</div>
                      <div className="sj-usermenu__id">id · {shortId()}</div>
                    </div>
                    <button
                      className="sj-usermenu__item"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(profileTargetForRole(role));
                      }}
                    >
                      Личный кабинет
                    </button>
                    {role === "ROLE_STUDENT" && (
                      <button
                        className="sj-usermenu__item"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/profile/edit");
                        }}
                      >
                        Настройки профиля
                      </button>
                    )}
                    {role === "ROLE_EMPLOYER" && (
                      <button
                        className="sj-usermenu__item"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/hr-profile/edit");
                        }}
                      >
                        Настройки HR
                      </button>
                    )}
                    <div className="sj-usermenu__divider" />
                    <button className="sj-usermenu__item sj-usermenu__item--danger" onClick={handleLogout}>
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="sj-btn sj-btn--primary sj-btn--sm"
              onClick={() => navigate("/auth")}
            >
              Войти
            </button>
          )}
        </div>
      </div>
      <div className="sj-header__rule" aria-hidden="true" />
    </header>
  );
}

function roleLabel(role: string | null): string {
  switch (role) {
    case "ROLE_STUDENT": return "Студент";
    case "ROLE_EMPLOYER": return "HR-специалист";
    case "ROLE_COMPANY_OWNER":
    case "ROLE_COMPANY": return "Владелец компании";
    case "ROLE_EXPERT": return "Эксперт-верификатор";
    case "ROLE_DEVELOPER": return "Разработчик";
    default: return "Гость";
  }
}

function shortId(): string {
  try {
    const raw = localStorage.getItem("me") || localStorage.getItem("user") || "";
    if (!raw) return "—";
    const u = JSON.parse(raw);
    const id = (u?.id || u?.uuid || u?.user_id || "").toString();
    return id ? id.slice(0, 8) : "—";
  } catch {
    return "—";
  }
}
