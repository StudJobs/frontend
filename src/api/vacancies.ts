import { apiGateway } from "./apiGateway";

export type VacancyItem = {
  id?: string;
  title?: string;
  salary?: number;
  experience?: number;
  schedule?: string;
  work_format?: string;
  position_status?: string;

  company_id?: string;

  attachment_id?: string;
  attachment_url?: string;

  create_at?: string;
  created_at?: string;
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
};

export type PositionItem = {
  id?: string;
  title?: string;
  name?: string;
  value?: string;
};

const unwrap = (resp: any) => resp?.data ?? resp ?? {};

async function tryRequest<T = any>(
  variants: Array<Parameters<typeof apiGateway>[0]>
): Promise<T> {
  let lastErr: any;
  for (const v of variants) {
    try {
      const r = await apiGateway(v);
      return unwrap(r) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export const VacanciesAPI = {
  async list(params?: VacancyListParams): Promise<VacancyListResponse> {
    const data = await tryRequest<any>([
      { method: "GET", url: "/vacancy", params },
      { method: "GET", url: "/vacancies", params },
    ]);

    if (Array.isArray(data)) return { vacancies: data };
    if (Array.isArray(data?.vacancies)) return data as VacancyListResponse;
    if (Array.isArray(data?.items)) return { pagination: data.pagination, vacancies: data.items };
    if (Array.isArray(data?.data?.vacancies)) return data.data as VacancyListResponse;
    if (Array.isArray(data?.data)) return { vacancies: data.data };
    return data as VacancyListResponse;
  },

  async positions(): Promise<PositionItem[]> {
    const data = await tryRequest<any>([
      { method: "GET", url: "/positions" },
      { method: "GET", url: "/position" },
    ]);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.positions)) return data.positions;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },

  async listMine(): Promise<VacancyItem[]> {
    const data = await tryRequest<any>([
      { method: "GET", url: "/vacancies/my" },
      { method: "GET", url: "/vacancies/me" },
      { method: "GET", url: "/hr/vacancies" },
      { method: "GET", url: "/vacancies" },
    ]);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },

  async create(payload: any): Promise<VacancyItem> {
    const data = await tryRequest<any>([
      { method: "POST", url: "/hr/vacancy", data: payload },
      { method: "POST", url: "/hr/vacancies", data: payload },
      { method: "POST", url: "/vacancies", data: payload },
    ]);

    return data as VacancyItem;
  },
};
