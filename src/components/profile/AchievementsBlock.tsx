import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import "../../assets/styles/global.css";
import "../../assets/styles/profile-mospolyjob.css";
import {
  AchievementsAPI,
  AchievementItem,
  ACHIEVEMENT_TYPES,
  achievementTypeLabel,
  VERIFICATION_STATUS,
  verificationStatusLabel,
} from "../../api/achievements";
import { useToast } from "../ui/Toast";

const verificationBadgeClass = (s?: number): string => {
  switch (s) {
    case VERIFICATION_STATUS.APPROVED:
      return "v-badge v-badge--approved";
    case VERIFICATION_STATUS.PENDING:
      return "v-badge v-badge--pending";
    case VERIFICATION_STATUS.REJECTED:
      return "v-badge v-badge--rejected";
    case VERIFICATION_STATUS.DRAFT:
    default:
      return "v-badge v-badge--draft";
  }
};

export type AchievementsBlockHandle = {
  openFileDialog: () => void;
};

type AchievementsBlockProps = {
  excludeFileNames?: string[];
};

const AchievementsBlock = forwardRef<
  AchievementsBlockHandle,
  AchievementsBlockProps
>(({ excludeFileNames = [] }, ref) => {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedType, setSelectedType] = useState<number>(0);
  // null = «все типы» (без фильтра). Иначе — type для items.filter.
  const [filterType, setFilterType] = useState<number | null>(null);
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await AchievementsAPI.list({
        hideSystem: true,
        excludeFileNames,
      });
      setItems(list);
    } catch (e) {
      console.error("Ошибка загрузки достижений:", e);
      setError("Не удалось загрузить достижения. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeFileNames.join("|")]);

  useImperativeHandle(ref, () => ({
    openFileDialog() {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    },
  }));

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError("");
      await AchievementsAPI.upload(file, file.name, selectedType);
      await loadAchievements();
      toast.success(
        "Достижение загружено",
        `«${file.name}» — теперь отправь его эксперту на верификацию.`
      );
    } catch (err) {
      console.error("Ошибка загрузки достижения:", err);
      setError("Не удалось загрузить достижение. Попробуйте позже.");
      toast.danger("Не удалось загрузить файл", "Проверьте размер и формат, попробуйте ещё раз.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить это достижение?")) return;
    try {
      setLoading(true);
      setError("");
      await AchievementsAPI.remove(id);
      await loadAchievements();
    } catch (err) {
      console.error("Ошибка удаления достижения:", err);
      setError("Не удалось удалить достижение. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async (numericId?: number) => {
    if (!numericId) return;
    try {
      setLoading(true);
      setError("");
      await AchievementsAPI.submitForReview(numericId);
      await loadAchievements();
      toast.success(
        "Отправлено эксперту",
        "Эксперт увидит задачу в очереди /expert и поставит решение в течение дня."
      );
    } catch (err: any) {
      console.error("Ошибка отправки на ревью:", err);
      setError(err?.message || "Не удалось отправить на ревью.");
      toast.danger("Не удалось отправить", err?.message || "Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-achievements-block">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="achievement-toolbar">
        <div className="achievement-toolbar__group">
          <label className="achievement-toolbar__label" htmlFor="ach-new-type">
            Загружаю как
          </label>
          <select
            id="ach-new-type"
            value={selectedType}
            onChange={(e) => setSelectedType(Number(e.target.value))}
          >
            {ACHIEVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="achievement-toolbar__upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || selectedType === 0}
            title={
              selectedType === 0
                ? "Сначала выберите тип достижения"
                : "Выбрать файл"
            }
          >
            + Файл
          </button>
        </div>

        <div className="achievement-toolbar__group achievement-toolbar__group--filter">
          <label className="achievement-toolbar__label" htmlFor="ach-filter-type">
            Фильтр
          </label>
          <select
            id="ach-filter-type"
            value={filterType === null ? "" : String(filterType)}
            onChange={(e) =>
              setFilterType(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">Все типы</option>
            {/* В фильтре «Без типа» (value=0) исключаем — есть отдельный
                «Иное» для категории, плюс «Без типа» останется только как
                переходное состояние при загрузке (и заблокирует кнопку). */}
            {ACHIEVEMENT_TYPES.filter((t) => t.value > 0).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>Загружаем достижения...</p>}
      {error && <p className="profile-error">{error}</p>}

      {(() => {
        const visibleItems =
          filterType === null
            ? items
            : items.filter((it) => (it.type ?? 0) === filterType);

        if (!loading && items.length === 0) {
          return (
            <p style={{ color: "var(--fg-subtle)", fontSize: 13, fontStyle: "italic" }}>
              Здесь будут ваши достижения. Загрузите первое — и нажмите «На проверку», чтобы подтвердить навыки у эксперта.
            </p>
          );
        }
        if (items.length > 0 && visibleItems.length === 0) {
          return (
            <p style={{ color: "var(--fg-subtle)", fontSize: 13, fontStyle: "italic" }}>
              Под этот фильтр ничего нет. Снимите фильтр, чтобы увидеть остальные достижения.
            </p>
          );
        }
        if (visibleItems.length === 0) return null;

        return (
        <ul className="achievements-list">
          {visibleItems.map((a) => {
            const status = a.verification_status;
            const canSubmit =
              !!a.numeric_id &&
              (status === VERIFICATION_STATUS.DRAFT ||
                status === VERIFICATION_STATUS.REJECTED ||
                status === undefined);

            // Имя для отображения:
            //   - microtask-ачивка (file_type=external/url): name = заголовок
            //     задачи, file_name = URL → показываем `name`.
            //   - обычная файл-ачивка: file_name = оригинальное имя файла
            //     (`course.docx`), name = internal id → показываем `file_name`.
            // Расширение выводим отдельным mono-цветом справа.
            const isExternalURL = a.file_type === "external/url";
            const displayBase = (
              isExternalURL
                ? a.name || a.file_name
                : a.file_name || a.name || "Файл"
            ).trim();
            const lastDot = displayBase.lastIndexOf(".");
            const baseName =
              lastDot > 0 ? displayBase.slice(0, lastDot) : displayBase;
            const ext =
              lastDot > 0 ? displayBase.slice(lastDot + 1).toLowerCase() : "";

            return (
              <li key={a.id} className="achievement-item">
                <div className="achievement-item__icon" aria-hidden="true">
                  {ext ? ext.slice(0, 3).toUpperCase() : "DOC"}
                </div>

                <div className="achievement-item__main">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="achievement-item__title"
                    title={displayBase}
                  >
                    <span className="achievement-item__name">{baseName}</span>
                    {ext ? (
                      <span className="achievement-item__ext">.{ext}</span>
                    ) : null}
                  </a>

                  <div className="achievement-item__meta">
                    {typeof a.type === "number" && a.type > 0 ? (
                      <span className="type-badge">
                        {achievementTypeLabel(a.type)}
                      </span>
                    ) : (
                      <span className="type-badge type-badge--empty">
                        Без типа
                      </span>
                    )}

                    {typeof status === "number" && status > 0 && (
                      <span
                        className={verificationBadgeClass(status)}
                        title={a.review_comment || ""}
                      >
                        {verificationStatusLabel(status)}
                      </span>
                    )}
                  </div>

                  {status === VERIFICATION_STATUS.REJECTED && a.review_comment ? (
                    <div className="review-comment">
                      Комментарий эксперта: {a.review_comment}
                    </div>
                  ) : null}
                </div>

                <div className="achievement-item__actions">
                  {canSubmit ? (
                    <button
                      type="button"
                      className="achievement-submit-btn"
                      onClick={() => handleSubmitForReview(a.numeric_id)}
                    >
                      На проверку
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="achievement-delete-btn"
                    onClick={() => handleDelete(a.id)}
                    aria-label="Удалить достижение"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        );
      })()}
    </div>
  );
});

export default AchievementsBlock;
