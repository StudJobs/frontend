import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/register-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { apiGateway } from "../api/apiGateway";

export default function Register() {
  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [jobSeeker, setJobSeeker] = useState(false);
  const [recruiter, setRecruiter] = useState(false);
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" | "" }>({
    text: "",
    type: "",
  });

  const handleJobSeekerChange = (checked: boolean) => {
    setJobSeeker(checked);
    if (checked) setRecruiter(false);
  };

  const handleRecruiterChange = (checked: boolean) => {
    setRecruiter(checked);
    if (checked) setJobSeeker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login.trim() || !password.trim() || !confirm.trim()) {
      setMessage({ text: "Пожалуйста, заполните все поля!", type: "error" });
      return;
    }
    if (password !== confirm) {
      setMessage({ text: "Пароли не совпадают!", type: "error" });
      return;
    }
    if (!jobSeeker && !recruiter) {
      setMessage({
        text: "Выберите: ищу работу или ищу кандидатов!",
        type: "error",
      });
      return;
    }
    if (!agree) {
      setMessage({
        text: "Вы должны согласиться с политикой конфиденциальности!",
        type: "error",
      });
      return;
    }

    try {
      // роль для отправки на бэкенд, надо ли?
      const role = jobSeeker ? "user" : "hr";

      const response = await apiGateway({
        method: "POST",
        url: "/auth/register",
        data: {
          login,
          password,
          role,
        },
      });

      console.log("Ответ от сервера:", response);

      setMessage({
        text: "Регистрация успешна! Теперь войдите в аккаунт.",
        type: "success",
      });

      setTimeout(() => navigate("/auth"), 1000);
    } catch (err: any) {
      console.error("Ошибка регистрации:", err);
      setMessage({
        text: err?.message || "Ошибка при регистрации. Попробуйте позже.",
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

          <input
            type="password"
            placeholder="Введите пароль..."
            className="register-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Подтвердите пароль..."
            className="register-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <div className="register-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={jobSeeker}
                onChange={(e) => handleJobSeekerChange(e.target.checked)}
              />
              Ищу работу
            </label>

            <label>
              <input
                type="checkbox"
                checked={recruiter}
                onChange={(e) => handleRecruiterChange(e.target.checked)}
              />
              Ищу кандидатов
            </label>
          </div>

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

          <button type="submit" className="register-button">
            Зарегистрироваться
          </button>

          <p className="register-login-link">
            Уже есть аккаунт?{" "}
            <Link to="/auth?mode=login" className="underline font-medium hover:text-neutral-700">
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
