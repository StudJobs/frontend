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
