import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/register-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { apiGateway } from "../api/apiGateway";

type BackendRole = "ROLE_STUDENT" | "ROLE_HR" | "ROLE_COMPANY";
type UiRole = "candidate" | "hr" | "company";

type FieldErrors = {
  email: string;
  password: string;
  confirm: string;
  role: string;
  agree: string;
};

const saveRoleForEmail = (email: string, role: BackendRole) => {
  try {
    const normalized = email.trim().toLowerCase();
    const raw = localStorage.getItem("userRoles");
    const map: Record<string, BackendRole> = raw ? JSON.parse(raw) : {};
    map[normalized] = role;
    localStorage.setItem("userRoles", JSON.stringify(map));
  } catch (e) {
    console.error("Не удалось сохранить роль для email", e);
  }
};

export default function Register() {
  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [selectedRole, setSelectedRole] = useState<UiRole | "">("");
  const [agree, setAgree] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    email: "",
    password: "",
    confirm: "",
    role: "",
    agree: "",
  });

  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success" | "";
  }>({
    text: "",
    type: "",
  });

  // если пользователь уже авторизован — не пускаем на регистрацию
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const storedRole = localStorage.getItem("role") as BackendRole | null;

    if (storedRole === "ROLE_HR" || storedRole === "ROLE_COMPANY") {
      navigate("/hr-profile", { replace: true });
    } else {
      navigate("/profile", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // сбрасываем прошлые ошибки
    setFieldErrors({
      email: "",
      password: "",
      confirm: "",
      role: "",
      agree: "",
    });
    setMessage({ text: "", type: "" });

    const trimmedEmail = login.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirm.trim();

    let hasError = false;
    const newErrors: FieldErrors = {
      email: "",
      password: "",
      confirm: "",
      role: "",
      agree: "",
    };

    // валидация email
    if (!trimmedEmail) {
      newErrors.email = "Введите email.";
      hasError = true;
    } else {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = "Введите корректный email.";
        hasError = true;
      }
    }

    // валидация пароля
    if (!trimmedPassword) {
      newErrors.password = "Введите пароль.";
      hasError = true;
    } else if (trimmedPassword.length < 6) {
      newErrors.password = "Пароль должен быть не короче 6 символов.";
      hasError = true;
    }

    // валидация подтверждения
    if (!trimmedConfirm) {
      newErrors.confirm = "Подтвердите пароль.";
      hasError = true;
    } else if (trimmedConfirm !== trimmedPassword) {
      newErrors.confirm = "Пароли не совпадают.";
      hasError = true;
    }

    // роль
    if (!selectedRole) {
      newErrors.role = "Выберите вашу роль.";
      hasError = true;
    }

    // согласие с политикой
    if (!agree) {
      newErrors.agree =
        "Необходимо согласиться с политикой конфиденциальности.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newErrors);
      return;
    }

    // Маппинг роли из UI в роль, которую ждёт бэкенд
    let backendRole: BackendRole;
    switch (selectedRole) {
      case "candidate":
        backendRole = "ROLE_STUDENT";
        break;
      case "hr":
        backendRole = "ROLE_HR";
        break;
      case "company":
        backendRole = "ROLE_COMPANY";
        break;
      default:
        backendRole = "ROLE_STUDENT";
    }

    try {
      const email = trimmedEmail.toLowerCase();

      const payload = {
        email,
        password: trimmedPassword,
        role: backendRole,
      };

      console.log("Register payload:", payload);

      const response = await apiGateway({
        method: "POST",
        url: "/auth/register",
        data: payload,
      });

      console.log("Ответ от сервера:", response);

      saveRoleForEmail(email, backendRole);

      setMessage({
        text: "Регистрация успешна! Теперь войдите в аккаунт.",
        type: "success",
      });

      setTimeout(() => navigate("/auth"), 1000);
    } catch (err: any) {
      console.error("Ошибка регистрации:", err);

      let msg = "Ошибка при регистрации. Попробуйте позже.";

      if (typeof err === "string") {
        msg = err;
      } else if (err?.message) {
        msg = err.message;
      } else if (err?.detail) {
        msg = err.detail;
      }

      setMessage({
        text: msg,
        type: "error",
      });
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="register-wrap">
        <h1 className="mj-register-title">Регистрация</h1>

        <form className="register-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Введите логин, почту или телефон..."
            className="register-input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          {fieldErrors.email && (
            <p className="register-field-error">{fieldErrors.email}</p>
          )}

          <input
            type="password"
            placeholder="Введите пароль..."
            className="register-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && (
            <p className="register-field-error">{fieldErrors.password}</p>
          )}

          <input
            type="password"
            placeholder="Подтвердите пароль..."
            className="register-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {fieldErrors.confirm && (
            <p className="register-field-error">{fieldErrors.confirm}</p>
          )}

          {/* Три роли: кандидат / HR / компания */}
          <div className="register-roles">
            <label className="register-role">
              <input
                type="checkbox"
                className="register-role-input"
                checked={selectedRole === "candidate"}
                onChange={() => setSelectedRole("candidate")}
              />
              <div className="register-role-text">
                <span className="register-role-title">Кандидат</span>
                <span className="register-role-subtitle">(я ищу работу)</span>
              </div>
            </label>

            <label className="register-role">
              <input
                type="checkbox"
                className="register-role-input"
                checked={selectedRole === "hr"}
                onChange={() => setSelectedRole("hr")}
              />
              <div className="register-role-text">
                <span className="register-role-title">HR</span>
                <span className="register-role-subtitle">
                  (я ищу сотрудников, физ. лицо)
                </span>
              </div>
            </label>

            <label className="register-role">
              <input
                type="checkbox"
                className="register-role-input"
                checked={selectedRole === "company"}
                onChange={() => setSelectedRole("company")}
              />
              <div className="register-role-text">
                <span className="register-role-title">Компания</span>
                <span className="register-role-subtitle">
                  (я ищу сотрудников, юр. лицо)
                </span>
              </div>
            </label>
          </div>
          {fieldErrors.role && (
            <p className="register-field-error">{fieldErrors.role}</p>
          )}

          <label className="register-privacy">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            Я согласен с{" "}
            <a href="#" target="_blank" rel="noopener noreferrer">
              политикой конфиденциальности
            </a>
          </label>
          {fieldErrors.agree && (
            <p className="register-field-error">{fieldErrors.agree}</p>
          )}

          <button type="submit" className="register-button">
            Зарегистрироваться
          </button>

          <p className="register-login-link">
            Уже есть аккаунт?{" "}
            <Link
              to="/auth?mode=login"
              className="underline font-medium hover:text-neutral-700"
            >
              Войти
            </Link>
          </p>
        </form>

        <div className="register-error-placeholder">
          {message.text && (
            <p
              className={
                message.type === "error"
                  ? "register-error-text"
                  : "register-success-text"
              }
            >
              {message.text}
            </p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
