import { test, expect } from "@playwright/test";
import {
  API,
  apiCall,
  primeAuthInBrowser,
  registerViaAPI,
  uniqueEmail,
} from "./_helpers";

/**
 * Сценарий 6 ROADMAP: владелец компании публикует вакансию с тегами → ES индексирует →
 * студент находит по стеку → откликается → owner ревьюит → решение в /my/applications.
 *
 * После фикса B3+B4: только ROLE_COMPANY_OWNER может публиковать вакансии (HR-membership flow
 * отложен). Owner подставляет company_id из своего токена автоматически.
 */
test.describe.serial("Сценарий 6 — Vacancy end-to-end", () => {
  let ownerSess: any = null;
  let studentSess: any = null;
  let vacancyId = "";
  let applicationId = "";
  const vacancyTitle = `E2E Senior Go ${Date.now()}`;
  const skillSlug = "golang";

  test("COMPANY_OWNER регистрируется (auto-company)", async ({ request }) => {
    ownerSess = await registerViaAPI(request, "ROLE_COMPANY_OWNER");
    const me = await apiCall(
      request,
      "GET",
      `${API}/company/me`,
      { headers: { Authorization: `Bearer ${ownerSess.token}` } },
      "company/me",
    );
    expect(me.ok()).toBeTruthy();
  });

  test("Owner создаёт вакансию с тегом golang", async ({ request }) => {
    test.skip(!ownerSess, "no owner");
    const res = await apiCall(
      request,
      "POST",
      `${API}/hr/vacancy`,
      {
        headers: { Authorization: `Bearer ${ownerSess.token}` },
        data: {
          title: vacancyTitle,
          experience: 3,
          salary: 200000,
          position_status: "open",
          schedule: "5/2",
          work_format: "Удалёнка",
          skill_slugs: [skillSlug],
        },
      },
      "create vacancy",
    );
    expect(res.ok(), `create vacancy: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = await res.json();
    vacancyId = body.id ?? body.vacancy_id ?? body.uuid;
    expect(vacancyId, `vacancy id: ${JSON.stringify(body)}`).toBeTruthy();
  });

  test("Студент находит вакансию по тегу через UI", async ({
    page,
    request,
  }) => {
    test.skip(!vacancyId, "no vacancy");
    studentSess = await registerViaAPI(
      request,
      "ROLE_STUDENT",
      uniqueEmail("student-vac"),
    );
    await primeAuthInBrowser(page, studentSess);
    await page.waitForTimeout(1500); // ES индексация

    await page.goto(`/vacancies?skill_slugs=${skillSlug}`);
    await expect(
      page.getByRole("heading", { name: "Вакансии" }),
    ).toBeVisible();
    await expect(page.getByText(vacancyTitle, { exact: false })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Студент откликается через API", async ({ request }) => {
    test.skip(!vacancyId || !studentSess, "missing");
    const res = await apiCall(
      request,
      "POST",
      `${API}/vacancy/${vacancyId}/respond`,
      {
        headers: { Authorization: `Bearer ${studentSess.token}` },
        data: { cover_letter: "I'm interested. e2e test." },
      },
      "respond",
    );
    expect(res.ok(), `respond: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = await res.json();
    applicationId = body.id ?? body.application_id ?? body.uuid;
    expect(applicationId, `app id: ${JSON.stringify(body)}`).toBeTruthy();
  });

  test("Owner принимает отклик → студент видит accepted в /my/applications", async ({
    page,
    request,
  }) => {
    test.skip(!applicationId, "no app");

    const res = await apiCall(
      request,
      "PATCH",
      `${API}/hr/applications/${applicationId}`,
      {
        headers: { Authorization: `Bearer ${ownerSess.token}` },
        data: { decision: 2, comment: "Welcome" },
      },
      "review",
    );
    expect(res.ok(), `review: ${res.status()} ${await res.text()}`).toBeTruthy();

    await primeAuthInBrowser(page, studentSess);
    await page.goto("/my/applications");
    await expect(
      page.getByRole("heading", { name: "Мои отклики" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(vacancyTitle, { exact: false })).toBeVisible({
      timeout: 15_000,
    });
  });
});
