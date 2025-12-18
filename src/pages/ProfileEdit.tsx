import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/profile-edit-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarDefault from "../assets/images/человек.png";
import { apiGateway } from "../api/apiGateway";
import { AchievementsAPI } from "../api/achievements";

const extractAvatarUrl = (fileInfo: any): string | undefined =>
  fileInfo?.download_url || fileInfo?.direct_url || fileInfo?.url;

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, "") || "";

const AVATAR_PREFIX = "user_avatar_";
const hasAvatarPrefix = (v?: string | null) =>
  !!v && String(v).startsWith(AVATAR_PREFIX);

const normalizeTelegram = (value: string): string | undefined => {
  const v = value.trim();
  if (!v) return undefined;

  const cleaned = v.replace(/^https?:\/\/t\.me\//i, "");
  const username = cleaned.replace(/^@/, "").trim();

  return username ? `@${username}` : undefined;
};

export default function ProfileEdit() {
  const navigate = useNavigate();

  const [photo, setPhoto] = useState<string>(avatarDefault);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarId, setAvatarId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    surname: "",
    name: "",
    age: "",
    email: "",
    telegram: "",
    profile: "",
    description: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await apiGateway({ method: "GET", url: "/users/me" });
        const data = (raw as any).data ?? raw;

        setFormData((prev) => ({
          ...prev,
          surname: data.last_name ?? "",
          name: data.first_name ?? "",
          age: data.age ? String(data.age) : "",
          email: data.email ?? "",
          telegram: data.telegram ?? data.tg ?? "",
          profile: data.profession_category ?? data.specialization ?? "",
          description: data.description ?? "",
        }));

        if (data.avatar_id) setAvatarId(String(data.avatar_id));

        try {
          const list = await AchievementsAPI.list();
          const avatarItem = list.find((it) =>
            [it.id, it.name, it.file_name].some((v) => hasAvatarPrefix(v))
          );

          if (avatarItem?.url) {
            setPhoto(avatarItem.url);
            setAvatarId((prev) => prev ?? avatarItem.id);
          } else if (data.avatar_url) {
            setPhoto(data.avatar_url);
          }
        } catch (err) {
          console.warn("Не удалось получить аватар:", err);
          if (data.avatar_url) setPhoto(data.avatar_url);
        }
      } catch (e) {
        console.error("Не удалось загрузить профиль для редактирования", e);
      }
    })();
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setPhoto(ev.target.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setAvatarUploading(true);
      setMessage("");

      const fd = new FormData();
      fd.append("avatar", file);

      const token = localStorage.getItem("token") || "";

      const resp = await fetch(`${API_BASE}/users/files/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("Upload avatar HTTP error:", resp.status, text);
        setMessage(`Не удалось загрузить аватар (код ${resp.status}).`);
        return;
      }

      const json = (await resp.json().catch(() => ({}))) as any;
      const fileInfo = json?.file_info ?? json?.data?.file_info ?? json;

      const newAvatarId: string | undefined =
        fileInfo?.id || fileInfo?.file_id || fileInfo?.avatar_id;

      const newAvatarUrl: string | undefined = extractAvatarUrl(fileInfo);

      if (newAvatarId) setAvatarId(String(newAvatarId));
      if (newAvatarUrl) setPhoto(newAvatarUrl);

      setMessage("Аватар обновлён! Не забудьте сохранить профиль.");
    } catch (err: any) {
      console.error("Ошибка загрузки аватара (fetch):", err);
      const status = err?.status ?? err?.response?.status ?? null;
      if (status === 401 || status === 403) {
        setMessage("Сессия истекла. Зайдите в аккаунт заново.");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1200);
      } else {
        setMessage("Не удалось загрузить аватар. Попробуйте позже.");
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    const requiredFields: Array<keyof typeof formData> = [
      "surname",
      "name",
      "age",
      "email",
      "profile",
    ];

    requiredFields.forEach((field) => {
      if (!String(formData[field] || "").trim()) {
        newErrors[String(field)] = "Обязательное поле";
      }
    });

    if (
      formData.email &&
      !/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(formData.email)
    ) {
      newErrors.email = "Некорректная почта";
    }

    if (formData.age) {
      const n = Number(formData.age);
      if (!Number.isFinite(n) || n <= 0) {
        newErrors.age = "Некорректный возраст";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      setMessage("Пожалуйста, заполните все обязательные поля корректно.");
      return;
    }

    try {
      setMessage("");

      const payload: any = {
        first_name: formData.name.trim(),
        last_name: formData.surname.trim(),
        age: formData.age ? Number(formData.age) : undefined,
        email: formData.email.trim() || undefined,
        telegram: normalizeTelegram(formData.telegram),
        profession_category: formData.profile || undefined,
        description: formData.description || undefined,
      };

      const resp = await apiGateway({
        method: "PATCH",
        url: "/users/edit",
        data: payload,
      });

      console.log("Profile edit response:", resp);
      setMessage("Данные успешно обновлены!");

      setTimeout(() => navigate("/profile"), 300);
    } catch (err: any) {
      console.error("Ошибка сохранения профиля:", err);
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "";
      setMessage(
        backendMsg
          ? `Не удалось сохранить профиль: ${backendMsg}`
          : "Не удалось сохранить профиль. Попробуйте позже."
      );
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-edit-section">
        <h2 className="edit-title">Редактирование профиля</h2>

        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="photo-upload">
            <img
              src={photo}
              alt="Фото профиля"
              className="profile-preview-rect"
            />
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
            <label htmlFor="file-upload" className="upload-btn">
              {avatarUploading ? "Загружаем..." : "Изменить фото"}
            </label>
          </div>

          <h3 className="subsection-title">Основная информация</h3>

          <div className="form-row">
            {[
              ["surname", "Фамилия", true],
              ["name", "Имя", true],
            ].map(([field, label, required]) => (
              <div className="form-field" key={field}>
                <label className="label-title">
                  {label} {required && <span className="required">*</span>}
                </label>
                <input
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                  className={errors[field] ? "error" : ""}
                />
                {errors[field] && (
                  <p className="error-text">{errors[field]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="label-title">
                Возраст <span className="required">*</span>
              </label>
              <input
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                className={errors.age ? "error" : ""}
              />
              {errors.age && <p className="error-text">{errors.age}</p>}
            </div>

            <div className="form-field">
              <label className="label-title">
                Профиль <span className="required">*</span>
              </label>
              <select
                name="profile"
                value={formData.profile}
                onChange={handleChange}
                className={errors.profile ? "error" : ""}
              >
                <option value="">Выберите</option>
                {[
                  "АСОИУ",
                  "Программная инженерия",
                  "Информационная безопасность",
                  "Бизнес-информатика",
                  "Мехатроника и робототехника",
                  "Дизайн",
                  "Журналистика",
                  "Геймдев",
                  "Веб-дизайн",
                  "Машиностроение",
                  "Ювелирное дело",
                  "Fullstack Developer",
                ].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.profile && (
                <p className="error-text">{errors.profile}</p>
              )}
            </div>
          </div>

          <h3 className="subsection-title">Контакты</h3>
          <div className="form-row">
            <div className="form-field">
              <label className="label-title">
                Электронная почта <span className="required">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "error" : ""}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="form-field">
              <label className="label-title">Telegram</label>
              <input
                name="telegram"
                value={formData.telegram}
                onChange={handleChange}
                placeholder="@username"
              />
            </div>
          </div>

          <h3 className="subsection-title">О себе</h3>
          <div className="form-field">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="submit-row">
            <button type="submit" className="profile-btn">
              Сохранить изменения
            </button>

            {message && (
              <p
                className={`form-message ${
                  message.includes("успешно") ? "success" : "error"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </section>

      <Footer />
    </div>
  );
}
