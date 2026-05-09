import { useState } from "react";
import SkillsInput from "../ui/SkillsInput";
import { apiGateway } from "../../api/apiGateway";
import { useToast } from "../ui/Toast";

type Props = {
  onClose: () => void;
  onCompleted: () => void;
  initialFirstName?: string;
  initialLastName?: string;
};

const STEPS = ["Имя", "Навыки", "Готово"];

export default function Onboarding({
  onClose,
  onCompleted,
  initialFirstName = "",
  initialLastName = "",
}: Props) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [education, setEducation] = useState("");
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const total = STEPS.length;
  const progress = Math.round(((step + 1) / total) * 100);

  const handleNext = async () => {
    setError("");
    if (step === 0) {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Введите имя и фамилию — это обязательно для рекрутера.");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      // Сохраняем профиль с собранным полем + skills.
      setBusy(true);
      try {
        await apiGateway({
          method: "PATCH",
          url: "/users/edit",
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            education_institution: education.trim() || undefined,
            skill_slugs: skillSlugs.length ? skillSlugs : undefined,
          },
        });
        setStep(2);
        toast.success(
          "Базовый профиль готов",
          `Заполнено ${progress}% — добавь резюме и описание, чтобы повысить шансы на оффер.`
        );
      } catch (e: any) {
        setError(e?.error || e?.message || "Не удалось сохранить — попробуйте позже.");
        toast.danger("Не удалось сохранить", "Проверьте подключение и попробуйте снова.");
      } finally {
        setBusy(false);
      }
      return;
    }
    // step === 2 — финал
    onCompleted();
  };

  const skip = () => {
    onClose();
  };

  return (
    <div className="mj-modal-backdrop" onClick={skip}>
      <div
        className="mj-modal"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mj-modal-header">
          <div>
            <h2 className="mj-modal-title">Добро пожаловать в StudJobs</h2>
            <p className="mj-modal-subtitle">
              Шаг {step + 1} из {total} · {STEPS[step]}
            </p>
          </div>
          <button
            type="button"
            className="mj-btn mj-btn--ghost"
            onClick={skip}
          >
            Пропустить
          </button>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: "var(--surface-elev)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--accent)",
              transition: "width var(--duration-base) var(--ease)",
            }}
          />
        </div>

        {step === 0 ? (
          <div className="mj-grid">
            <div className="mj-field">
              <label className="mj-label">Имя</label>
              <input
                className="mj-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Александр"
                autoFocus
              />
            </div>
            <div className="mj-field">
              <label className="mj-label">Фамилия</label>
              <input
                className="mj-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Иванов"
              />
            </div>
            <div className="mj-field" style={{ gridColumn: "1 / -1" }}>
              <label className="mj-label">Учебное заведение (опционально)</label>
              <input
                className="mj-input"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Московский политехнический университет"
              />
              <span className="mj-note">
                HR из партнёров вуза получают приоритетный доступ к выпускникам того же
                учебного заведения.
              </span>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mj-field">
            <label className="mj-label">Что ты умеешь?</label>
            <SkillsInput
              value={skillSlugs}
              onChange={setSkillSlugs}
              placeholder="Начни вводить: Go, React, K8s, ..."
            />
            <span className="mj-note">
              Минимум один навык — без них вакансии и микрозадачи на /tasks тебя не
              увидят. Добавь 3–5 ключевых, остальные дозаполнишь в профиле.
            </span>
          </div>
        ) : null}

        {step === 2 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
            }}
          >
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--success-soft)",
                color: "var(--success)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              ✓
            </span>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--fg)",
                textAlign: "center",
              }}
            >
              Профиль готов на {progress}%
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--fg-muted)",
                textAlign: "center",
                maxWidth: 420,
                lineHeight: 1.6,
              }}
            >
              Дальше — добавь резюме и описание в /profile/edit, загрузи первое
              достижение, и эксперт поставит зелёный бейдж «Подтверждено».
            </div>
          </div>
        ) : null}

        {error ? <div className="mj-alert mj-alert--err">{error}</div> : null}

        <div className="mj-actions">
          {step === 2 ? (
            <button className="mj-btn mj-btn--primary" onClick={onCompleted}>
              К моему профилю
            </button>
          ) : (
            <>
              <button
                type="button"
                className="mj-btn mj-btn--primary"
                disabled={busy}
                onClick={handleNext}
              >
                {busy ? "Сохраняем…" : step === 0 ? "Дальше" : "Сохранить и продолжить"}
              </button>
              {step > 0 ? (
                <button
                  type="button"
                  className="mj-btn mj-btn--ghost"
                  disabled={busy}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Назад
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
