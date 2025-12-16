import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/auth-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { apiGateway } from "../api/apiGateway";

type BackendRole = "ROLE_STUDENT" | "ROLE_EMPLOYER" | "ROLE_COMPANY";

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
      if (map[normalized]) return map[normalized];
    }
  } catch (e) {
    console.error("Не удалось получить роль для email", e);
  }
  return "ROLE_STUDENT";
};

const pickAuthData = (resp: any) => {
  const data = resp?.data ?? resp ?? {};

  const token =
    data?.token || data?.access_token || data?.accessToken || data?.jwt || "";

  const role: BackendRole | undefined =
    data?.role || data?.user?.role || data?.data?.role;

  return { data, token, role };
};

export default function Auth() {
  useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const storedRole = (localStorage.getItem("role") || "").trim() as BackendRole;

    setRedirectTo(storedRole === "ROLE_EMPLOYER" ? "/hr-profile" : "/profile");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setFieldErrors({ email: "", password: "" });
    setError("");

    const trimmedEmail = login.trim();
    const trimmedPassword = password.trim();

    let hasError = false;
    const newErrors: FieldErrors = { email: "", password: "" };

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
      const guessedRole = getRoleForEmail(email);

      const payload = {
        email,
        password: trimmedPassword,
        role: guessedRole,
      };

      console.log("Login payload:", payload);

      const resp = await apiGateway({
        method: "POST",
        url: "/auth/login",
        data: payload,
      });

      const { data, token, role } = pickAuthData(resp);
      console.log("Авторизация успешна:", data);

      if (!token) throw new Error("Сервер не вернул token");

      localStorage.setItem("token", token);

      const finalRole: BackendRole = ((role || guessedRole) as BackendRole);
      localStorage.setItem("role", finalRole);

      setRedirectTo(finalRole === "ROLE_EMPLOYER" ? "/hr-profile" : "/profile");
    } catch (err: any) {
      console.error("Ошибка авторизации:", err);

      let msg = "Ошибка при авторизации. Проверьте данные.";

      const raw =
        String(
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            err?.detail ||
            err?.message ||
            ""
        ) || "";

      if (/invalid email or password/i.test(raw)) msg = "Неверный email или пароль.";
      else if (raw) msg = raw;

      setError(msg);
    }
  };

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

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
