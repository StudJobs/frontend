import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import "../../assets/styles/global.css";
import "../../assets/styles/profile-mospolyjob.css";
import { AchievementsAPI, AchievementItem } from "../../api/achievements";

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
      await AchievementsAPI.upload(file, file.name);
      await loadAchievements();
    } catch (err) {
      console.error("Ошибка загрузки достижения:", err);
      setError("Не удалось загрузить достижение. Попробуйте позже.");
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

  return (
    <div className="profile-achievements-block">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {loading && <p>Загружаем достижения...</p>}
      {error && <p className="profile-error">{error}</p>}

      {!loading && items.length === 0 && (
        <p>Достижения ещё не добавлены.</p>
      )}

      {items.length > 0 && (
        <ul className="achievements-list">
          {items.map((a) => (
            <li key={a.id} className="achievement-item">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="achievement-link"
              >
                {a.name || a.file_name}
              </a>

              <button
                type="button"
                className="achievement-delete-btn"
                onClick={() => handleDelete(a.id)}
                aria-label="Удалить достижение"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default AchievementsBlock;
