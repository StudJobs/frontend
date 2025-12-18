import { apiGateway } from "./apiGateway";

export type AchievementItem = {
  id: string;
  name: string;
  file_name: string;
  url: string;
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
      const id: string = String(item.id ?? item.name ?? item.file_name ?? "");
      const name: string = String(item.name ?? item.file_name ?? id);
      const fileName: string = String(item.file_name ?? item.fileName ?? name);

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
        name,
        file_name: fileName,
        url,
      });
    }

    return result;
  },

  async upload(file: File, displayName?: string) {
    const name = displayName || file.name;

    const metaResp = await apiGateway({
      method: "POST",
      url: "/user/achievements",
      data: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        name,
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
