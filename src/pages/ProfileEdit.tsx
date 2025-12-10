import React, { useEffect, useState } from "react";
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

export default function ProfileEdit() {
  const [photo, setPhoto] = useState<string>(avatarDefault);
  const [avatarUploading, setAvatarUploading] = useState(false);
  // avatarId оставляем на будущее, но НЕ шлём его в /users/edit
  const [avatarId, setAvatarId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    surname: "",
    name: "",
    patronymic: "",
    age: "",
    phone: "",
    email: "",
    github: "",
    figma: "",
    vk: "",
    telegram: "",
    other: "",
    gender: "",
    city: "",
    experience: "",
    course: "",
    profile: "",
    education: "",
    form: "",
    description: "",
    login: "",
    password: "",
    confirmPassword: "",
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
          patronymic: data.middle_name ?? "",
          age: data.age ? String(data.age) : "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          github: data.github ?? "",
          figma: data.figma ?? "",
          vk: data.vk ?? "",
          telegram: data.telegram ?? "",
          other: data.other ?? "",
          gender: data.gender ?? "",
          city: data.city ?? "",
          experience: data.experience ?? "",
          course: data.course ?? "",
          profile: data.profession_category ?? "",
          education: data.education_level ?? "",
          form: data.education_form ?? "",
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
          console.warn("Не удалось получить аватар из достижений:", err);
          if (data.avatar_url) setPhoto(data.avatar_url);
        }
      } catch (e) {
        console.error("Не удалось загрузить профиль для редактирования", e);
      }
    })();
  }, []);

  const handlePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      const fileInfo =
        json?.file_info ??
        json?.data?.file_info ??
        json;

      const newAvatarId: string | undefined =
        fileInfo?.id || fileInfo?.file_id || fileInfo?.avatar_id;

      const newAvatarUrl: string | undefined = extractAvatarUrl(fileInfo);

      if (newAvatarId) {
        setAvatarId(String(newAvatarId));
      }
      if (newAvatarUrl) {
        setPhoto(newAvatarUrl);
      }

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

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    let formatted = "+7";
    if (digits.length > 1) formatted += " (" + digits.slice(1, 4);
    if (digits.length >= 5) formatted += ") " + digits.slice(4, 7);
    if (digits.length >= 8) formatted += "-" + digits.slice(7, 9);
    if (digits.length >= 10) formatted += "-" + digits.slice(9, 11);

    setFormData((prev) => ({ ...prev, phone: formatted }));
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
    const requiredFields = [
      "surname",
      "name",
      "age",
      "phone",
      "email",
      "gender",
      "city",
      "experience",
      "course",
      "profile",
      "education",
      "form",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = "Обязательное поле";
      }
    });

    if (
      formData.email &&
      !/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(formData.email)
    ) {
      newErrors.email = "Некорректная почта";
    }

    if (formData.phone && formData.phone.replace(/\D/g, "").length < 11) {
      newErrors.phone = "Некорректный номер телефона";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают";
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
        first_name: formData.name,
        last_name: formData.surname,
        middle_name: formData.patronymic || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        github: formData.github || undefined,
        figma: formData.figma || undefined,
        vk: formData.vk || undefined,
        telegram: formData.telegram || undefined,
        other: formData.other || undefined,
        gender: formData.gender || undefined,
        city: formData.city || undefined,
        experience: formData.experience || undefined,
        course: formData.course || undefined,
        profession_category: formData.profile || undefined,
        education_level: formData.education || undefined,
        education_form: formData.form || undefined,
        description: formData.description || undefined,
        // avatar_id намеренно НЕ отправляем – за аватар отвечает /users/files/avatar
      };

      const resp = await apiGateway({
        method: "PATCH",
        url: "/users/edit",
        data: payload,
      });

      console.log("Profile edit response:", resp);
      setMessage("Данные успешно обновлены!");
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

          <div className="form-row">
            {[
              ["surname", "Фамилия", true],
              ["name", "Имя", true],
              ["patronymic", "Отчество (при наличии)", false],
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
                Телефон <span className="required">*</span>
              </label>
              <input
                name="phone"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={errors.phone ? "error" : ""}
              />
              {errors.phone && <p className="error-text">{errors.phone}</p>}
            </div>

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
          </div>

          <div className="form-row">
            {["github", "figma", "vk", "telegram", "other"].map((field) => (
              <div className="form-field" key={field}>
                <label className="label-title">
                  {field === "other"
                    ? "Прочее"
                    : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  name={field}
                  value={(formData as any)[field]}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          <div className="form-row">
            {[
              ["gender", "Пол", ["Мужской", "Женский"]],
              [
                "city",
                "Город",
                ["Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Другой"],
              ],
              [
                "experience",
                "Опыт работы",
                [
                  "Без опыта",
                  "Менее года",
                  "1 год",
                  "2 года",
                  "3 года",
                  "4 года",
                  "5 лет",
                  "6 лет",
                  "7 лет",
                  "8 лет",
                  "9 лет",
                  "10 лет",
                  "Более 10 лет",
                ],
              ],
              [
                "course",
                "Курс",
                [
                  "1 курс",
                  "2 курс",
                  "3 курс",
                  "4 курс",
                  "1 курс магистратуры",
                  "2 курс магистратуры",
                  "Аспирантура",
                ],
              ],
              [
                "profile",
                "Профиль",
                [
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
                ],
              ],
              [
                "education",
                "Уровень образования",
                [
                  "Начальное",
                  "Среднее",
                  "Среднее профессиональное",
                  "Высшее (бакалавриат)",
                  "Высшее (специалитет)",
                  "Высшее (магистратура)",
                  "Другое",
                ],
              ],
              ["form", "Форма обучения", ["Очная", "Очно-заочная", "Заочная"]],
            ].map(([name, label, options]) => (
              <div className="form-field" key={name}>
                <label className="label-title">
                  {label} <span className="required">*</span>
                </label>
                <select
                  name={name as string}
                  value={(formData as any)[name]}
                  onChange={handleChange}
                  className={errors[name] ? "error" : ""}
                >
                  <option value="">Выберите</option>
                  {(options as string[]).map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
                {errors[name] && (
                  <p className="error-text">{errors[name]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="form-field">
            <label className="label-title">О себе</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <h3 className="subsection-title">Изменить данные для входа:</h3>
          <div className="form-row">
            <div className="form-field">
              <input
                name="login"
                placeholder="Введите новый логин, почту или телефон..."
                value={formData.login}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <input
                name="password"
                placeholder="Введите новый пароль..."
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <input
                name="confirmPassword"
                placeholder="Подтвердите новый пароль..."
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? "error" : ""}
              />
              {errors.confirmPassword && (
                <p className="error-text">{errors.confirmPassword}</p>
              )}
            </div>
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
