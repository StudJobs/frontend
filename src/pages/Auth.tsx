import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import "../assets/styles/global.css";
import "../assets/styles/auth-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { apiGateway } from "../api/apiGateway";

type BackendRole = "ROLE_STUDENT" | "ROLE_DEVELOPER" | "ROLE_HR" | "ROLE_COMPANY";

type FieldErrors = {
  email: string;
  password: string;
};

const getRoleForEmail = (email: string): BackendRole => {
  try {
    const normalized = email.trim().toLowerCase();
    const raw = localStorage.getItem("userRoles");
    if (raw) {
      const map: Record<string, BackendRole> = JSON.parse(raw);
      if (map[normalized]) {
        return map[normalized];
      }
    }
  } catch (e) {
    console.error("Не удалось получить роль для email", e);
  }
  // дефолт, если ничего не знаем про пользователя
  return "ROLE_STUDENT";
};

export default function Auth() {
  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    email: "",
    password: "",
  });

  // общий текст ошибки от сервера
  const [error, setError] = useState("");

  // если пользователь уже авторизован — не пускаем на страницу авторизации
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

    setFieldErrors({ email: "", password: "" });
    setError("");

    const trimmedEmail = login.trim();
    const trimmedPassword = password.trim();

    let hasError = false;
    const newErrors: FieldErrors = { email: "", password: "" };

    // email
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

    // пароль
    if (!trimmedPassword) {
      newErrors.password = "Введите пароль.";
      hasError = true;
    } else if (trimmedPassword.length < 6) {
      newErrors.password = "Пароль должен быть не короче 6 символов.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newErrors);
      return;
    }

    try {
      const email = trimmedEmail.toLowerCase();
      const role = getRoleForEmail(email);

      const payload = {
        email,
        password: trimmedPassword,
        role,
      };

      console.log("Login payload:", payload);

      const response = await apiGateway({
        method: "POST",
        url: "/auth/login",
        data: payload,
      });

      console.log("Авторизация успешна:", response);

      if (response?.token) {
        localStorage.setItem("token", response.token);
      }

      const responseRole: BackendRole | undefined = response?.role;
      const finalRole: BackendRole = responseRole || role;

      localStorage.setItem("role", finalRole);

      // простая маршрутизация по роли
      if (finalRole === "ROLE_HR" || finalRole === "ROLE_COMPANY") {
        navigate("/hr-profile");
      } else {
        navigate("/profile");
      }
    } catch (err: any) {
      console.error("Ошибка авторизации:", err);

      let msg = "Ошибка при авторизации. Проверьте данные.";

      if (err && typeof err === "object") {
        const raw = (err.message || (err as any).detail || "").toString();

        // маппим бекендовый текст на русский
        if (/invalid email or password/i.test(raw)) {
          msg = "Неверный email или пароль.";
        } else if (raw) {
          msg = raw;
        }
      } else if (typeof err === "string") {
        msg = err;
      }

      setError(msg);
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="auth-wrap">
        <h1 className="mj-auth-title">Авторизация</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Введите логин, почту или телефон..."
            className="auth-input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          {fieldErrors.email && (
            <p className="auth-field-error">{fieldErrors.email}</p>
          )}

          <input
            type="password"
            placeholder="Введите пароль..."
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && (
            <p className="auth-field-error">{fieldErrors.password}</p>
          )}

          <button type="submit" className="auth-button">
            Войти
          </button>
        </form>

        <p className="auth-forgot">
          <Link
            to="/restore-password"
            className="underline font-medium hover:text-neutral-700"
          >
            Забыли пароль?
          </Link>
        </p>

        <p className="auth-register">
          У Вас нет аккаунта?{" "}
          <Link
            to="/auth?mode=register"
            className="underline font-medium hover:text-neutral-700"
          >
            Зарегистрируйтесь!
          </Link>
        </p>

        {error && (
          <div className="auth-error-placeholder">
            <p className="auth-error-text">{error}</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
