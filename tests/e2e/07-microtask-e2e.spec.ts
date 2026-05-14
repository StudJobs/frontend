import { test, expect } from "@playwright/test";
import {
  API,
  apiCall,
  primeAuthInBrowser,
  registerViaAPI,
  uniqueEmail,
} from "./_helpers";

/**
 * Сценарий 5 ROADMAP: HR создаёт микрозадачу → студент берёт → сдаёт →
 * HR принимает → у студента в портфолио появляется MICROTASK_RESULT APPROVED.
 */
test.describe.serial("Сценарий 5 — Microtask end-to-end (auto-achievement)", () => {
  let ownerSess: any = null;
  let studentSess: any = null;
  let taskId = "";
  let submissionId = "";
  const taskTitle = `E2E Microtask ${Date.now()}`;

  test("COMPANY_OWNER (auto-company) создаёт микрозадачу", async ({
    request,
  }) => {
    ownerSess = await registerViaAPI(request, "ROLE_COMPANY_OWNER");

    const me = await apiCall(
      request,
      "GET",
      `${API}/company/me`,
      { headers: { Authorization: `Bearer ${ownerSess.token}` } },
      "company/me",
    );
    expect(me.ok()).toBeTruthy();

    const deadline = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
    const t = await apiCall(
      request,
      "POST",
      `${API}/hr/tasks`,
      {
        headers: { Authorization: `Bearer ${ownerSess.token}` },
        data: {
          title: taskTitle,
          description: "Make e2e flow green",
          reward: 5000,
          deadline,
          skill_slugs: ["golang"],
        },
      },
      "create task",
    );
    expect(t.ok(), `task: ${t.status()} ${await t.text()}`).toBeTruthy();
    const tb = await t.json();
    taskId = tb.id ?? tb.task_id ?? tb.uuid ?? tb.microtask_id;
    expect(taskId, `task id: ${JSON.stringify(tb)}`).toBeTruthy();
  });

  test("Студент берёт задачу (Apply)", async ({ request }) => {
    test.skip(!taskId, "no task");
    studentSess = await registerViaAPI(
      request,
      "ROLE_STUDENT",
      uniqueEmail("student-mt"),
    );
    const r = await apiCall(
      request,
      "POST",
      `${API}/tasks/${taskId}/apply`,
      { headers: { Authorization: `Bearer ${studentSess.token}` } },
      "apply",
    );
    expect(r.ok(), `apply: ${r.status()} ${await r.text()}`).toBeTruthy();
  });

  test("Студент сдаёт решение (Submit)", async ({ request }) => {
    test.skip(!taskId || !studentSess, "missing");
    const r = await apiCall(
      request,
      "POST",
      `${API}/tasks/${taskId}/submit`,
      {
        headers: { Authorization: `Bearer ${studentSess.token}` },
        data: {
          solution_url: "https://github.com/e2e/solution",
          comment: "Done.",
        },
      },
      "submit",
    );
    expect(r.ok(), `submit: ${r.status()} ${await r.text()}`).toBeTruthy();
    const body = await r.json();
    submissionId = body.id ?? body.submission_id ?? body.uuid;
    expect(submissionId, `submission id: ${JSON.stringify(body)}`).toBeTruthy();
  });

  test("Owner апрувит сабмишен → у студента появляется MICROTASK_RESULT-ачивка", async ({
    request,
    page,
  }) => {
    test.skip(!submissionId, "no submission");

    const r = await apiCall(
      request,
      "POST",
      `${API}/hr/tasks/submissions/${submissionId}/review`,
      {
        headers: { Authorization: `Bearer ${ownerSess.token}` },
        data: { status: 2, review_comment: "approved by e2e" },
      },
      "review",
    );
    expect(r.ok(), `review: ${r.status()} ${await r.text()}`).toBeTruthy();

    await primeAuthInBrowser(page, studentSess);
    // Auto-achievement идёт best-effort gRPC из MicroTasks → Achievements,
    // фронт подтягивает /user/achievements отдельным запросом — даём небольшую фору.
    await page.waitForTimeout(2_000);
    await page.goto("/profile");
    await expect(
      page.getByRole("button", { name: "Редактировать информацию" }),
    ).toBeVisible({ timeout: 15_000 });
    // Тайтл ачивки = title задачи. Ретраим reload до 30 секунд (gRPC может проседать).
    await expect(async () => {
      await page.reload();
      await expect(
        page.getByText(taskTitle, { exact: false }),
      ).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000, intervals: [3_000] });
  });
});
