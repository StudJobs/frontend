// Тесты на экспертизу для подтверждения навыков эксперта.
// Без пройденного теста эксперт не может ревьюить ачивки типов
// PET_PROJECT и SKILL_VERIFICATION по этому навыку (только сертификатные).
import { apiGateway } from "./apiGateway";

export type TestQuestion = {
  id: number;
  text: string;
  options: string[];
};

export type ExpertiseTest = {
  skill_slug: string;
  available: boolean;
  reason?: string;
  questions: TestQuestion[];
  pass_threshold_pct?: number;
};

export type SubmitTestResponse = {
  passed: boolean;
  correct: number;
  total: number;
  score_pct: number;
  message: string;
};

const unwrap = (r: any) => r?.data ?? r ?? {};

export const ExpertiseAPI = {
  async getTest(slug: string): Promise<ExpertiseTest> {
    const data = unwrap(
      await apiGateway({ method: "GET", url: `/expert/test/${encodeURIComponent(slug)}` })
    );
    return {
      skill_slug: data?.skill_slug || slug,
      available: !!data?.available,
      reason: data?.reason,
      questions: Array.isArray(data?.questions) ? data.questions : [],
      pass_threshold_pct: data?.pass_threshold_pct,
    };
  },

  async submitTest(slug: string, answerIndices: number[]): Promise<SubmitTestResponse> {
    const data = unwrap(
      await apiGateway({
        method: "POST",
        url: `/expert/test/${encodeURIComponent(slug)}`,
        data: { answer_indices: answerIndices },
      })
    );
    return data as SubmitTestResponse;
  },
};
