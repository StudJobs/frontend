import { apiGateway } from "./apiGateway";

export type UsersListParams = {
  page?: number;
  limit?: number;
  category?: string;
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

  avatar_url?: string;
  avatar_id?: string;
  resume_url?: string;
  resume_id?: string;

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

export const UsersAPI = {
  async list(params: UsersListParams): Promise<UsersListResponse> {
    const data = unwrap(
      await apiGateway({
        method: "GET",
        url: "/users",
        params: {
          ...(params.page ? { page: params.page } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
          ...(params.category ? { category: params.category } : {}),
        },
      })
    );

    if (data?.pagination || data?.profiles) return data as UsersListResponse;

    if (Array.isArray(data)) {
      return { profiles: data as UserListItem[] };
    }
    if (Array.isArray(data?.items)) {
      return { profiles: data.items as UserListItem[] };
    }

    return { profiles: [] };
  },
};
