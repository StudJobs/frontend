import { apiGateway } from "./apiGateway";

export type AchievementItem = {
  id: string;          // строковый ID (для обратной совместимости — может быть и именем)
  numeric_id?: number; // числовой ID из БД (нужен для submit/review)
  name: string;
  file_name: string;
  url: string;
  type?: number;
  verification_status?: number;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  user_uuid?: string;
  created_at?: string;
};

export const ACHIEVEMENT_TYPES: Array<{ value: number; label: string }> = [
  { value: 0, label: "Без типа" },
  { value: 1, label: "Пет-проект" },
  { value: 2, label: "Курсовая" },
  { value: 3, label: "Хакатон" },
  { value: 4, label: "Курс / сертификат" },
  { value: 5, label: "Микрозадача" },
  { value: 6, label: "Иное" },
];

export const VERIFICATION_STATUS = {
  UNSPECIFIED: 0,
  DRAFT: 1,
  PENDING: 2,
  APPROVED: 3,
  REJECTED: 4,
} as const;

export const verificationStatusLabel = (s?: number): string => {
  switch (s) {
    case VERIFICATION_STATUS.DRAFT:
      return "Черновик";
    case VERIFICATION_STATUS.PENDING:
      return "На проверке";
    case VERIFICATION_STATUS.APPROVED:
      return "Подтверждено";
    case VERIFICATION_STATUS.REJECTED:
      return "Отклонено";
    default:
      return "—";
  }
};

export const achievementTypeLabel = (type?: number): string => {
  const entry = ACHIEVEMENT_TYPES.find((t) => t.value === (type ?? 0));
  return entry ? entry.label : "Без типа";
};

const unwrap = (resp: any) => resp?.data ?? resp;

const isSystemFileName = (value?: string | null): boolean => {
  if (!value) return false;
  return /^user_(avatar|resume)_/i.test(String(value));
};

type ListOptions = {
  excludeFileNames?: string[];
  hideSystem?: boolean;
};

export const AchievementsAPI = {
  async list(options?: ListOptions): Promise<AchievementItem[]> {
    const { excludeFileNames = [], hideSystem = false } = options ?? {};

    const resp = await apiGateway({
      method: "GET",
      url: "/user/achievements",
    });

    const data = unwrap(resp);
    const rawList: any[] = data?.achievements ?? data ?? [];

    const result: AchievementItem[] = [];

    for (const item of rawList) {
      const numericId: number | undefined =
        typeof item.id === "number"
          ? item.id
          : typeof item.id === "string" && /^\d+$/.test(item.id)
          ? Number(item.id)
          : undefined;
      const name: string = String(item.name ?? item.file_name ?? "");
      const fileName: string = String(item.file_name ?? item.fileName ?? name);
      // id в API мы используем как ключ для download (это name) — оставляем для совместимости.
      const id: string = name || String(numericId ?? "");

      if (!id) continue;

      if (hideSystem && (isSystemFileName(name) || isSystemFileName(fileName))) {
        continue;
      }

      if (excludeFileNames.includes(name) || excludeFileNames.includes(fileName)) {
        continue;
      }

      let url = "";
      try {
        const dlResp = await apiGateway({
          method: "GET",
          url: `/user/achievements/${encodeURIComponent(id)}/download`,
        });
        const dlData = unwrap(dlResp);

        url =
          dlData.download_url ??
          dlData.url ??
          dlData.direct_url ??
          dlData.link ??
          "";
      } catch (e) {
        console.warn("Не удалось получить download_url для достижения", id, e);
      }

      result.push({
        id,
        numeric_id: numericId,
        name,
        file_name: fileName,
        url,
        type: typeof item.type === "number" ? item.type : undefined,
        verification_status:
          typeof item.verification_status === "number"
            ? item.verification_status
            : undefined,
        reviewed_by: item.reviewed_by ?? undefined,
        reviewed_at: item.reviewed_at ?? undefined,
        review_comment: item.review_comment ?? undefined,
        user_uuid: item.user_uuid ?? undefined,
        created_at: item.created_at ?? undefined,
      });
    }

    return result;
  },

  async submitForReview(numericId: number) {
    await apiGateway({
      method: "POST",
      url: `/user/achievements/${numericId}/submit`,
    });
  },

  async upload(file: File, displayName?: string, type: number = 0) {
    const name = displayName || file.name;

    const metaResp = await apiGateway({
      method: "POST",
      url: "/user/achievements",
      data: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        name,
        type,
      },
    });

    const root = unwrap(metaResp) || {};
    const meta = (root as any).meta ?? root;
    const uploadInfo = (root as any).upload_url ?? (root as any).uploadUrl ?? {};

    const id: string = String(
      (meta as any).id ??
        (meta as any).name ??
        (meta as any).file_name ??
        (meta as any).fileName ??
        name
    );

    const uploadUrl: string = String(
      (uploadInfo as any).upload_url ??
        (uploadInfo as any).url ??
        (uploadInfo as any).href ??
        ""
    );

    const s3Key: string = String(
      (uploadInfo as any).s3_key ??
        (uploadInfo as any).s3Key ??
        (uploadInfo as any).key ??
        ""
    );

    if (!uploadUrl) throw new Error("upload_url is missing");
    if (!s3Key) throw new Error("s3_key is missing");

    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    let confirmUrl: string =
      (uploadInfo as any).confirm_url ??
      (uploadInfo as any).confirmUrl ??
      (meta as any).confirm_url ??
      (meta as any).confirmUrl ??
      (root as any).confirm_url ??
      (root as any).confirmUrl ??
      "";

    if (!confirmUrl) {
      confirmUrl = `/user/achievements/${encodeURIComponent(id)}/confirm`;
    }

    await apiGateway({
      method: "POST",
      url: confirmUrl,
      data: { s3_key: s3Key },
    });

    return { id };
  },

  async rename(_oldId: string, _newName: string) {
    console.warn("Переименование достижений не реализовано на бэке");
    return Promise.resolve();
  },

  async remove(id: string) {
    await apiGateway({
      method: "DELETE",
      url: `/user/achievements/${encodeURIComponent(id)}`,
    });
  },
};
