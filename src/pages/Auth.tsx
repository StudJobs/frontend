import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/auth-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { apiGateway } from "../api/apiGateway";

export default function Auth() {
  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login.trim() || !password.trim()) {
      setError("Пожалуйста, заполните все поля!");
      return;
    }

    try {
      setError("");

      // Запрос к бэку
      const response = await apiGateway({
        method: "POST",
        url: "/auth/login", // эндпоинт на бэке, заменить?
        data: { login, password },
      });

      if (response?.token) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", response.role);
      }

      console.log("Авторизация успешна:", response);
      navigate(response.role === "hr" ? "/hr-profile" : "/profile");

    } catch (err: any) {
      console.error("Ошибка авторизации:", err);
      setError(err?.message || "Ошибка при авторизации. Проверьте данные.");
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
          <input
            type="password"
            placeholder="Введите пароль..."
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="auth-button">
            Войти
          </button>
        </form>

        <p className="auth-register">
          У Вас нет аккаунта?{" "}
          <Link
            to="/auth?mode=register"
            className="underline font-medium hover:text-neutral-700"
          >
            Зарегистрируйтесь!
          </Link>
        </p>

        {error && <p className="auth-error-text">{error}</p>}
      </section>

      <Footer />
    </div>
  );
}
