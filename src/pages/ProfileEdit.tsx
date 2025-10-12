/*Страница сырая, нет отсылок к бэку. Хочу добавить автоподстановку данных из бэка и отправку данных на него*/
import React, { useState } from "react";
import "../assets/styles/global.css";
import "../assets/styles/profile-edit-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import avatarDefault from "../assets/images/человек.png";

export default function ProfileEdit() {
  const [photo, setPhoto] = useState<string>(avatarDefault);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPhoto(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    let formatted = "+7";
    if (digits.length > 1) formatted += " (" + digits.slice(1, 4);
    if (digits.length >= 5) formatted += ") " + digits.slice(4, 7);
    if (digits.length >= 8) formatted += "-" + digits.slice(7, 9);
    if (digits.length >= 10) formatted += "-" + digits.slice(9, 11);

    setFormData({ ...formData, phone: formatted });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
      if (!formData[field as keyof typeof formData])
        newErrors[field] = "Обязательное поле";
    });

    if (formData.email && !/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(formData.email))
      newErrors.email = "Некорректная почта";

    if (formData.phone && formData.phone.replace(/\D/g, "").length < 11)
      newErrors.phone = "Некорректный номер телефона";

    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Пароли не совпадают";

    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setMessage("Пожалуйста, заполните все обязательные поля корректно.");
    } else {
      setMessage("Данные успешно обновлены!");
    }
  };

  return (
    <div className="page-frame">
      <Header />

      <section className="profile-edit-section">
        <h2 className="edit-title">Редактирование профиля</h2>

        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="photo-upload">
            <img src={photo} alt="Фото профиля" className="profile-preview-rect" />
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
            <label htmlFor="file-upload" className="upload-btn">
              Изменить фото
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
                {errors[field] && <p className="error-text">{errors[field]}</p>}
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
                  {field === "other" ? "Прочее" : field.charAt(0).toUpperCase() + field.slice(1)}
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
              ["city", "Город", ["Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Другой"]],
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
                {errors[name] && <p className="error-text">{errors[name]}</p>}
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
              />
            </div>
          </div>

          <div className="submit-row">
            <button type="submit" className="profile-btn">
              Сохранить изменения
            </button>

            {message && (
              <p className={`form-message ${message.includes("успешно") ? "success" : "error"}`}>
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
