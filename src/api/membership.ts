import { apiGateway } from "./apiGateway";
import { CompanyMember } from "./users";

const unwrap = (r: any) => r?.data ?? r ?? {};

export const MembershipAPI = {
  // HR подаёт заявку в компанию.
  async apply(companyID: string, note?: string): Promise<CompanyMember> {
    const data = unwrap(
      await apiGateway({
        method: "POST",
        url: `/company/${encodeURIComponent(companyID)}/membership/apply`,
        data: { note: note || "" },
      })
    );
    return data as CompanyMember;
  },

  // Текущая membership пользователя (или 404 если нет).
  async my(): Promise<CompanyMember | null> {
    try {
      const data = unwrap(await apiGateway({ method: "GET", url: "/company/membership/my" }));
      return data as CompanyMember;
    } catch {
      return null;
    }
  },

  // Owner: список сотрудников своей компании (filter по status).
  async listMembers(status?: number): Promise<CompanyMember[]> {
    const data = unwrap(
      await apiGateway({ method: "GET", url: "/company/members", params: status ? { status } : {} })
    );
    return Array.isArray(data?.members) ? data.members : [];
  },

  // Owner approve/reject.
  async review(membershipID: string, status: 2 | 3): Promise<CompanyMember> {
    const data = unwrap(
      await apiGateway({
        method: "POST",
        url: `/company/membership/${encodeURIComponent(membershipID)}/review`,
        data: { status },
      })
    );
    return data as CompanyMember;
  },
};

export const VacancyModerationAPI = {
  // Owner approve/reject вакансии.
  async moderate(vacancyID: string, status: 2 | 3, comment?: string): Promise<void> {
    await apiGateway({
      method: "POST",
      url: `/hr/vacancy/${encodeURIComponent(vacancyID)}/moderate`,
      data: { status, comment: comment || "" },
    });
  },
};
