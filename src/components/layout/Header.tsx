import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import lupa from "../../assets/images/лупа.png";
import person from "../../assets/images/человек.png";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleProfileClick = () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
      if (role === "hr") navigate("/hr-profile");
      else navigate("/profile");
    } else {
      navigate("/auth");
    }
  };

  const is404 = location.pathname === "/404";

  return (
    <header className="mj-header">
      <div className="mj-logo" onClick={() => navigate("/")}>
        <img src={logo} alt="Московский политех" />
      </div>

      <div className="mj-search">
        <div className="mj-search-input" />
        <img src={lupa} alt="Поиск" className="mj-search-icon" />
      </div>

      <nav className="mj-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            !is404 && isActive ? "active-nav" : undefined
          }
        >
          Главная
        </NavLink>
        <NavLink
          to="/404"
          className={({ isActive }) =>
            !is404 && isActive ? "active-nav" : undefined
          }
        >
          О нас
        </NavLink>
        <NavLink
          to="/404"
          className={({ isActive }) =>
            !is404 && isActive ? "active-nav" : undefined
          }
        >
          Контактная информация
        </NavLink>
        <span className="mj-profile" onClick={handleProfileClick} style={{ cursor: "pointer" }}>
          <img src={person} alt="Профиль" />
        </span>
      </nav>
    </header>
  );
};

export default Header;