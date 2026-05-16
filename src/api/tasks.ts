import { apiGateway } from "./apiGateway";

// Статусы микрозадачи. Совпадают с enum MicroTaskStatus в proto.
export const TASK_STATUS = {
  UNSPECIFIED: 0,
  OPEN: 1,
  ASSIGNED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
} as const;

export const taskStatusLabel = (s?: number) => {
  switch (s) {
    case TASK_STATUS.OPEN:
      return "Открыта";
    case TASK_STATUS.ASSIGNED:
      return "В работе";
    case TASK_STATUS.COMPLETED:
      return "Завершена";
    case TASK_STATUS.CANCELLED:
      return "Закрыта";
    default:
      return "—";
  }
};

// Статусы submission'а. Совпадают с enum SubmissionStatus в proto.
export const SUBMISSION_STATUS = {
  UNSPECIFIED: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;

export const submissionStatusLabel = (s?: number) => {
  switch (s) {
    case SUBMISSION_STATUS.PENDING:
      return "На ревью";
    case SUBMISSION_STATUS.APPROVED:
      return "Принято";
    case SUBMISSION_STATUS.REJECTED:
      return "Отклонено";
    default:
      return "—";
  }
};

export type MicroTask = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  reward: number;
  deadline?: string;
  skill_slugs?: string[];
  status: number;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
  is_skill_quest?: boolean;
  target_student_id?: string;
  target_skill_slug?: string;
};

export type MicroTaskListResponse = {
  tasks?: MicroTask[];
  pagination?: {
    total?: number;
    pages?: number;
    current_page?: number;
  };
};

export type Submission = {
  id: string;
  microtask_id: string;
  student_id: string;
  solution_url: string;
  comment?: string;
  status: number;
  review_comment?: string;
  submitted_at?: string;
  reviewed_at?: string;
  solution_file_name?: string;
  solution_file_url?: string;
};

export type SubmissionListResponse = {
  submissions?: Submission[];
  pagination?: {
    total?: number;
    pages?: number;
    current_page?: number;
  };
};

export type ListTasksParams = {
  page?: number;
  limit?: number;
  status?: number;
  skill_slugs?: string;
  q?: string;
  reward_min?: number;
};

export type CreateTaskRequest = {
  title: string;
  description: string;
  reward?: number;
  deadline?: string;
  skill_slugs?: string[];
};

export type UpdateTaskRequest = Partial<CreateTaskRequest>;

const unwrap = (resp: any) => resp?.data ?? resp ?? {};

export const TasksAPI = {
  // Студенческие операции
  async list(params?: ListTasksParams): Promise<MicroTaskListResponse> {
    const data = unwrap(await apiGateway({ method: "GET", url: "/tasks/", params }));
    if (Array.isArray(data?.tasks)) return data as MicroTaskListResponse;
    if (Array.isArray(data)) return { tasks: data };
    return data as MicroTaskListResponse;
  },

  async get(id: string): Promise<MicroTask> {
    const data = unwrap(await apiGateway({ method: "GET", url: `/tasks/${encodeURIComponent(id)}` }));
    return data as MicroTask;
  },

  async apply(id: string): Promise<MicroTask> {
    const data = unwrap(await apiGateway({ method: "POST", url: `/tasks/${encodeURIComponent(id)}/apply` }));
    return data as MicroTask;
  },

  async submit(id: string, payload: { solution_url?: string; comment?: string; solution_file_name?: string }): Promise<Submission> {
    const data = unwrap(await apiGateway({
      method: "POST",
      url: `/tasks/${encodeURIComponent(id)}/submit`,
      data: payload,
    }));
    return data as Submission;
  },

  async solutionUploadInit(taskId: string, fileName: string): Promise<{ file_id: string; upload_url: string }> {
    const data = unwrap(await apiGateway({
      method: "POST",
      url: `/tasks/${encodeURIComponent(taskId)}/solution-upload-init`,
      data: { file_name: fileName },
    }));
    return data as { file_id: string; upload_url: string };
  },

  async solutionUploadConfirm(taskId: string, fileId: string): Promise<void> {
    await apiGateway({
      method: "POST",
      url: `/tasks/${encodeURIComponent(taskId)}/solution-upload-confirm`,
      data: { file_id: fileId },
    });
  },

  // Эксперт создаёт квест-задачу под конкретного студента и навык.
  async createSkillQuest(payload: {
    target_student_id: string;
    target_skill_slug: string;
    title: string;
    description?: string;
    deadline?: string;
  }): Promise<MicroTask> {
    const data = unwrap(await apiGateway({ method: "POST", url: "/expert/quests", data: payload }));
    return data as MicroTask;
  },

  async listMySubmissions(): Promise<SubmissionListResponse> {
    const data = unwrap(await apiGateway({ method: "GET", url: "/tasks/my-submissions" }));
    if (Array.isArray(data?.submissions)) return data as SubmissionListResponse;
    return data as SubmissionListResponse;
  },

  // Микрозадачи, которые текущий студент взял (ASSIGNED + COMPLETED).
  // status=0 — все, status=2 — в работе, status=3 — завершённые.
  async listMyAssigned(params?: { page?: number; limit?: number; status?: number }): Promise<MicroTaskListResponse> {
    const data = unwrap(await apiGateway({ method: "GET", url: "/tasks/mine", params }));
    if (Array.isArray(data?.tasks)) return data as MicroTaskListResponse;
    if (Array.isArray(data)) return { tasks: data };
    return data as MicroTaskListResponse;
  },

  // HR-операции
  async listMine(): Promise<MicroTaskListResponse> {
    const data = unwrap(await apiGateway({ method: "GET", url: "/hr/tasks/" }));
    if (Array.isArray(data?.tasks)) return data as MicroTaskListResponse;
    if (Array.isArray(data)) return { tasks: data };
    return data as MicroTaskListResponse;
  },

  async create(payload: CreateTaskRequest): Promise<MicroTask> {
    const data = unwrap(await apiGateway({ method: "POST", url: "/hr/tasks/", data: payload }));
    return data as MicroTask;
  },

  async update(id: string, payload: UpdateTaskRequest): Promise<MicroTask> {
    const data = unwrap(await apiGateway({
      method: "PATCH",
      url: `/hr/tasks/${encodeURIComponent(id)}`,
      data: payload,
    }));
    return data as MicroTask;
  },

  async remove(id: string): Promise<void> {
    await apiGateway({ method: "DELETE", url: `/hr/tasks/${encodeURIComponent(id)}` });
  },

  async listSubmissions(taskId: string): Promise<SubmissionListResponse> {
    const data = unwrap(await apiGateway({
      method: "GET",
      url: `/hr/tasks/${encodeURIComponent(taskId)}/submissions`,
    }));
    if (Array.isArray(data?.submissions)) return data as SubmissionListResponse;
    return data as SubmissionListResponse;
  },

  async review(submissionId: string, status: 2 | 3, reviewComment?: string): Promise<Submission> {
    const data = unwrap(await apiGateway({
      method: "POST",
      url: `/hr/tasks/submissions/${encodeURIComponent(submissionId)}/review`,
      data: { status, review_comment: reviewComment || "" },
    }));
    return data as Submission;
  },
};
