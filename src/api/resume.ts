import { apiGateway } from "./apiGateway";

export type ResumeInfo = {
  file_name: string;
  url: string | null;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, "") || "";

const safeGet = <T = any>(obj: any, path: string[], fallback: T): T => {
  let cur: any = obj;
  for (const p of path) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return fallback;
    }
  }
  return (cur as T) ?? fallback;
};

export const ResumeAPI = {
  async get(): Promise<ResumeInfo | null> {
    try {
      const resp = await apiGateway({
        method: "GET",
        url: "/users/files/resume",
      });

      const data = (resp as any)?.data ?? resp;

      const fileInfo =
        data?.file_info ??
        data?.resume ??
        data;

      if (!fileInfo) return null;

      const fileName: string =
        fileInfo.file_name ?? fileInfo.filename ?? "resume";
      const url: string | null =
        safeGet(fileInfo, ["download_url"], null) ??
        safeGet(fileInfo, ["url"], null);

      return { file_name: fileName, url };
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      if (status === 404) return null;
      console.error("Ошибка получения резюме:", e);
      throw e;
    }
  },

  async upload(file: File): Promise<void> {
    const fd = new FormData();
    fd.append("resume", file);

    const token = localStorage.getItem("token") || "";

    const resp = await fetch(`${API_BASE}/users/files/resume`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Ошибка загрузки резюме", resp.status, text);
      throw new Error("Не удалось загрузить резюме");
    }
  },

  async remove(): Promise<void> {
    await apiGateway({
      method: "DELETE",
      url: "/users/files/resume",
    });
  },
};
