import { apiGateway } from "./apiGateway";

export type Skill = {
  id?: number;
  slug: string;
  name: string;
  category?: number;
  popularity?: number;
};

const unwrap = (resp: any) => resp?.data ?? resp ?? [];

const toArray = (raw: any): Skill[] => {
  const data = unwrap(raw);
  if (Array.isArray(data)) return data as Skill[];
  if (Array.isArray(data?.skills)) return data.skills as Skill[];
  return [];
};

export const SkillsAPI = {
  async search(query: string, limit = 20, category?: number): Promise<Skill[]> {
    const raw = await apiGateway({
      method: "GET",
      url: "/skills/search",
      params: {
        q: query,
        limit,
        ...(category ? { category } : {}),
      },
    });
    return toArray(raw);
  },

  async popular(limit = 20, category?: number): Promise<Skill[]> {
    const raw = await apiGateway({
      method: "GET",
      url: "/skills/popular",
      params: {
        limit,
        ...(category ? { category } : {}),
      },
    });
    return toArray(raw);
  },

  async bulk(slugs: string[]): Promise<Skill[]> {
    if (!slugs?.length) return [];
    const raw = await apiGateway({
      method: "GET",
      url: "/skills/bulk",
      params: { slugs: slugs.join(",") },
    });
    return toArray(raw);
  },
};
