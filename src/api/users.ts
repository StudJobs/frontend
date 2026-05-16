import { apiGateway } from "./apiGateway";
import { AchievementItem } from "./achievements";

export type UsersListParams = {
  page?: number;
  limit?: number;
  category?: string;
  role?: string;
};

export type UserListItem = {
  id?: string;
  first_name?: string;
  last_name?: string;
  age?: number;
  email?: string;
  tg?: string;
  telegram?: string;
  description?: string;
  profession_category?: string;
  specialization?: string;
  education_institution?: string;

  avatar_url?: string;
  avatar_id?: string;
  resume_url?: string;
  resume_id?: string;

  skill_slugs?: string[];
  verified_skill_slugs?: string[];
  role?: string;
};

export type UsersListResponse = {
  pagination?: {
    current_page?: number;
    pages?: number;
    total?: number;
  };
  profiles?: UserListItem[];
};

const unwrap = (resp: any) => resp?.data ?? resp ?? {};

// Кэш для UsersAPI.me() — внутри одной сессии не дёргаем сетевой запрос повторно.
let _meCache: { id: string; profile?: UserListItem } | null = null;

export const UsersAPI = {
  // Возвращает профиль текущего пользователя по токену.
  // Использует /users/me для STUDENT/DEVELOPER, /hr/me для HR, /company/me для COMPANY.
  // Минимально нужно поле id — для сверки «эта запись принадлежит мне».
  async me(force = false): Promise<{ id: string; profile?: UserListItem } | null> {
    if (!force && _meCache) return _meCache;
    const role = (typeof window !== "undefined" ? localStorage.getItem("role") || "" : "").toUpperCase();
    const candidates: string[] = [];
    if (role.includes("STUDENT") || role.includes("DEVELOPER")) candidates.push("/users/me");
    if (role.includes("HR") || role.includes("COMPANY")) candidates.push("/hr/me");
    if (role.includes("EXPERT")) candidates.push("/users/me", "/hr/me");
    if (candidates.length === 0) candidates.push("/users/me", "/hr/me");
    for (const url of candidates) {
      try {
        const data = unwrap(await apiGateway({ method: "GET", url }));
        const id = String(data?.id || data?.user_id || data?.profile?.id || "");
        if (id) {
          _meCache = { id, profile: data as UserListItem };
          return _meCache;
        }
      } catch {
        // 401/403 — пробуем следующий
      }
    }
    return null;
  },

  // Сбрасывает кэш — вызвать на logout.
  clearMeCache(): void {
    _meCache = null;
  },

  async list(params: UsersListParams): Promise<UsersListResponse> {
    const data = unwrap(
      await apiGateway({
        method: "GET",
        url: "/users",
        params: {
          ...(params.page != null ? { page: params.page } : {}),
          ...(params.limit != null ? { limit: params.limit } : {}),
          ...(params.category && params.category.trim()
            ? { category: params.category.trim() }
            : {}),
          ...(params.role && params.role.trim() ? { role: params.role.trim() } : {}),
        },
      })
    );

    if (data?.pagination || data?.profiles) return data as UsersListResponse;

    if (Array.isArray(data)) return { profiles: data as UserListItem[] };
    if (Array.isArray(data?.items)) return { profiles: data.items as UserListItem[] };
    if (Array.isArray(data?.users)) return { profiles: data.users as UserListItem[] };
    if (Array.isArray(data?.data)) return { profiles: data.data as UserListItem[] };

    return { profiles: [] };
  },

  async get(id: string): Promise<UserListItem | null> {
    const data = unwrap(await apiGateway({ method: "GET", url: `/users/${id}` }));
    if (!data) return null;
    // backend может вернуть либо профиль напрямую, либо { user: {...} }
    return (data.user ?? data.profile ?? data) as UserListItem;
  },

  async listAchievements(id: string): Promise<AchievementItem[]> {
    const data = unwrap(
      await apiGateway({ method: "GET", url: `/users/${id}/achievements` })
    );
    const raw: any[] = data?.achievements ?? data ?? [];
    return raw.map((item: any) => {
      const numericId: number | undefined =
        typeof item.id === "number"
          ? item.id
          : typeof item.id === "string" && /^\d+$/.test(item.id)
          ? Number(item.id)
          : undefined;
      const name: string = String(item.name ?? item.file_name ?? "");
      const fileName: string = String(item.file_name ?? name);
      const isExternal = String(item.file_type ?? "") === "external/url";
      return {
        id: name || String(numericId ?? ""),
        numeric_id: numericId,
        name,
        file_name: fileName,
        url: isExternal ? fileName : "",
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
      } as AchievementItem;
    });
  },
};
