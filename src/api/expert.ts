import { apiGateway } from "./apiGateway";
import { AchievementItem, VERIFICATION_STATUS } from "./achievements";

const unwrap = (resp: any) => resp?.data ?? resp;

export type ExpertReviewDecision =
  | typeof VERIFICATION_STATUS.APPROVED
  | typeof VERIFICATION_STATUS.REJECTED;

export const ExpertAPI = {
  // Очередь PENDING-достижений для эксперта (только метаданные — без download URL).
  async queue(page = 1, limit = 20): Promise<AchievementItem[]> {
    const resp = await apiGateway({
      method: "GET",
      url: `/expert/queue?page=${page}&limit=${limit}`,
    });
    const data = unwrap(resp);
    const rawList: any[] = data?.achievements ?? data ?? [];

    const out: AchievementItem[] = [];
    for (const item of rawList) {
      const numericId: number | undefined =
        typeof item.id === "number"
          ? item.id
          : typeof item.id === "string" && /^\d+$/.test(item.id)
          ? Number(item.id)
          : undefined;
      const name: string = String(item.name ?? item.file_name ?? "");
      const fileName: string = String(item.file_name ?? item.fileName ?? name);

      out.push({
        id: name,
        numeric_id: numericId,
        name,
        file_name: fileName,
        url: "",
        type: typeof item.type === "number" ? item.type : undefined,
        verification_status: VERIFICATION_STATUS.PENDING,
        user_uuid: item.user_uuid,
        created_at: item.created_at,
      });
    }
    return out;
  },

  async review(
    achievementId: number,
    decision: ExpertReviewDecision,
    comment: string
  ) {
    await apiGateway({
      method: "POST",
      url: `/expert/achievements/${achievementId}/review`,
      data: { decision, comment },
    });
  },
};
