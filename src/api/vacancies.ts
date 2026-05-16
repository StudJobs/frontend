import { apiGateway } from "./apiGateway";

export type VacancyItem = {
  id: string;
  title?: string;
  salary?: number;
  min_salary?: number;
  experience?: number;
  schedule?: string;
  work_format?: string;
  position_status?: string;

  company_id?: string;

  attachment_id?: string;
  attachment_url?: string;

  create_at?: string;
  created_at?: string;

  skill_slugs?: string[];

  // Модерация (для HR-flow).
  moderation_status?: number; // 1=PENDING, 2=PUBLISHED, 3=REJECTED
  author_id?: string;
  moderation_comment?: string;
};

export type VacancyPagination = {
  current_page?: number;
  pages?: number;
  total?: number;
};

export type VacancyListResponse = {
  pagination?: VacancyPagination;
  vacancies?: VacancyItem[];
};

export type VacancyListParams = {
  page?: number;
  limit?: number;
  company_id?: string;
  position_status?: string;
  work_format?: string;
  schedule?: string;
  min_salary?: number;
  max_salary?: number;
  min_experience?: number;
  max_experience?: number;
  search_title?: string;
  // CSV slug-ов навыков. Передаётся в Gateway, который роутит в Search-сервис (Elasticsearch).
  skill_slugs?: string;
};

export type PositionItem = {
  id?: string;
  title?: string;
  name?: string;
  value?: string;
};

const unwrap = (resp: any) => resp?.data ?? resp ?? {};

export const VacanciesAPI = {
  async list(params?: VacancyListParams): Promise<VacancyListResponse> {
    const r = await apiGateway({ method: "GET", url: "/vacancy", params });
    const data = unwrap(r);

    if (Array.isArray(data)) return { vacancies: data };
    if (Array.isArray(data?.vacancies)) return data as VacancyListResponse;
    if (Array.isArray(data?.items)) return { pagination: data.pagination, vacancies: data.items };
    if (Array.isArray(data?.data?.vacancies)) return data.data as VacancyListResponse;
    if (Array.isArray(data?.data)) return { vacancies: data.data };
    return data as VacancyListResponse;
  },

  async positions(): Promise<PositionItem[]> {
    const r = await apiGateway({ method: "GET", url: "/positions" });
    const data = unwrap(r);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.positions)) return data.positions;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },

  async listMine(): Promise<VacancyItem[]> {
    const r = await apiGateway({ method: "GET", url: "/hr/vacancy" });
    const data = unwrap(r);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.vacancies)) return data.vacancies;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },

  async create(payload: any): Promise<VacancyItem> {
    const r = await apiGateway({ method: "POST", url: "/hr/vacancy", data: payload });
    return unwrap(r) as VacancyItem;
  },

  async listHR(params?: VacancyListParams): Promise<VacancyListResponse> {
    const r = await apiGateway({ method: "GET", url: "/hr/vacancy", params });
    const data = unwrap(r);
    if (Array.isArray(data)) return { vacancies: data };
    if (Array.isArray(data?.vacancies)) return data as VacancyListResponse;
    return data as VacancyListResponse;
  },
};
