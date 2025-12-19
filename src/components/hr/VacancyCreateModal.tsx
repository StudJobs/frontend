import React, { useMemo, useState } from "react";
import "../../assets/styles/vacancy-modal.css";
import { VacanciesAPI, VacancyItem } from "../../api/vacancies";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (v: VacancyItem) => void;
};

const toNumberOrUndefined = (v: string) => {
  const t = String(v ?? "").trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

export default function VacancyCreateModal({ open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    salary: "",
    experience: "",
    schedule: "",
    work_format: "",
    position_status: "",
    attachment_id: "",
    attachment_url: "",
    company_id: "",
  });

  const canSubmit = useMemo(() => {
    return form.title.trim().length > 0;
  }, [form.title]);

  if (!open) return null;

  const setField = (name: string, value: string) =>
    setForm((p) => ({ ...p, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (!canSubmit) {
      setMsg("Заполни хотя бы название вакансии.");
      return;
    }

    const payload: any = {
      title: form.title.trim(),
      salary: toNumberOrUndefined(form.salary),
      experience: toNumberOrUndefined(form.experience),
      schedule: form.schedule.trim() || undefined,
      work_format: form.work_format.trim() || undefined,
      position_status: form.position_status.trim() || undefined,
      attachment_id: form.attachment_id.trim() || undefined,
      attachment_url: form.attachment_url.trim() || undefined,
      company_id: form.company_id.trim() || undefined,
    };

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    try {
      setSaving(true);
      const created = await VacanciesAPI.create(payload);
      onCreated(created);
      onClose();
    } catch (err: any) {
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "";
      setMsg(backendMsg ? `Не удалось создать вакансию: ${backendMsg}` : "Не удалось создать вакансию.");
      console.error("Create vacancy error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mj-modal-backdrop" onMouseDown={onClose}>
      <div className="mj-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mj-modal-head">
          <h3 className="mj-modal-title">Создать вакансию</h3>
          <button className="mj-modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <form className="mj-modal-form" onSubmit={handleSubmit}>
          <div className="mj-field">
            <label className="mj-label">Название *</label>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Например: Frontend developer"
            />
          </div>

          <div className="mj-grid2">
            <div className="mj-field">
              <label className="mj-label">Зарплата</label>
              <input
                value={form.salary}
                onChange={(e) => setField("salary", e.target.value)}
                type="number"
                placeholder="100000"
              />
            </div>

            <div className="mj-field">
              <label className="mj-label">Опыт (лет)</label>
              <input
                value={form.experience}
                onChange={(e) => setField("experience", e.target.value)}
                type="number"
                placeholder="1"
              />
            </div>
          </div>

          <div className="mj-grid2">
            <div className="mj-field">
              <label className="mj-label">График</label>
              <input
                value={form.schedule}
                onChange={(e) => setField("schedule", e.target.value)}
                placeholder="5/2, 2/2, гибкий..."
              />
            </div>

            <div className="mj-field">
              <label className="mj-label">Формат работы</label>
              <input
                value={form.work_format}
                onChange={(e) => setField("work_format", e.target.value)}
                placeholder="офис/удалёнка/гибрид"
              />
            </div>
          </div>

          <div className="mj-grid2">
            <div className="mj-field">
              <label className="mj-label">Статус позиции</label>
              <input
                value={form.position_status}
                onChange={(e) => setField("position_status", e.target.value)}
                placeholder="открыта/на паузе/закрыта"
              />
            </div>

            <div className="mj-field">
              <label className="mj-label">Company ID (если нужно)</label>
              <input
                value={form.company_id}
                onChange={(e) => setField("company_id", e.target.value)}
                placeholder="string"
              />
            </div>
          </div>

          <div className="mj-grid2">
            <div className="mj-field">
              <label className="mj-label">Attachment ID</label>
              <input
                value={form.attachment_id}
                onChange={(e) => setField("attachment_id", e.target.value)}
                placeholder="string"
              />
            </div>
            <div className="mj-field">
              <label className="mj-label">Attachment URL</label>
              <input
                value={form.attachment_url}
                onChange={(e) => setField("attachment_url", e.target.value)}
                placeholder="string"
              />
            </div>
          </div>

          <div className="mj-modal-actions">
            <button type="button" className="profile-btn mj-btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="profile-btn" disabled={!canSubmit || saving}>
              {saving ? "Создаём..." : "Создать вакансию"}
            </button>
          </div>

          {msg && <p className="mj-modal-msg">{msg}</p>}
        </form>
      </div>
    </div>
  );
}
