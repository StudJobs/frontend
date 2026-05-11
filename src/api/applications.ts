// API-клиент откликов на вакансии.
// Бэкенд: Vacancy-сервис (gRPC ApplicationService), Gateway REST-фасад.
//
// Статусы (совпадают с ApplicationStatus в proto):
//   1 = PENDING   — ожидает решения HR
//   2 = ACCEPTED  — HR принял
//   3 = REJECTED  — HR отклонил
import { apiGateway } from "./apiGateway";

export type ApplicationStatus = 1 | 2 | 3;

export interface Application {
  id: string;
  vacancy_id: string;
  student_id: string;
  cover_letter: string;
  status: ApplicationStatus;
  hr_comment: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationList {
  applications: Application[];
  pagination?: {
    total?: number;
    pages?: number;
    current_page?: number;
  };
}

function unwrap(resp: any): any {
  return resp?.data ?? resp ?? {};
}

export const ApplicationsAPI = {
  async apply(vacancyId: string, coverLetter?: string): Promise<Application> {
    const body = coverLetter && coverLetter.trim() ? { cover_letter: coverLetter.trim() } : undefined;
    const resp = await apiGateway({
      method: "POST",
      url: `/vacancy/${encodeURIComponent(vacancyId)}/respond`,
      data: body,
    });
    return unwrap(resp) as Application;
  },

  async listMine(params?: { page?: number; limit?: number; status?: ApplicationStatus }): Promise<ApplicationList> {
    const resp = await apiGateway({
      method: "GET",
      url: "/user/applications",
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        ...(params?.status ? { status: params.status } : {}),
      },
    });
    const data = unwrap(resp);
    return {
      applications: Array.isArray(data?.applications) ? data.applications : [],
      pagination: data?.pagination,
    };
  },

  async withdraw(applicationId: string): Promise<void> {
    await apiGateway({
      method: "DELETE",
      url: `/user/applications/${encodeURIComponent(applicationId)}`,
    });
  },

  async listForVacancy(vacancyId: string, params?: { page?: number; limit?: number; status?: ApplicationStatus }): Promise<ApplicationList> {
    const resp = await apiGateway({
      method: "GET",
      url: `/hr/vacancy/${encodeURIComponent(vacancyId)}/applications`,
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        ...(params?.status ? { status: params.status } : {}),
      },
    });
    const data = unwrap(resp);
    return {
      applications: Array.isArray(data?.applications) ? data.applications : [],
      pagination: data?.pagination,
    };
  },

  async review(applicationId: string, decision: 2 | 3, comment?: string): Promise<Application> {
    const resp = await apiGateway({
      method: "PATCH",
      url: `/hr/applications/${encodeURIComponent(applicationId)}`,
      data: { decision, comment: comment ?? "" },
    });
    return unwrap(resp) as Application;
  },
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  1: "На рассмотрении",
  2: "Принят",
  3: "Отклонён",
};
