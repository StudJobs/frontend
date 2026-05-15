import { test, expect } from "@playwright/test";
import { registerViaAPI, apiCall, API } from "./_helpers";

test.describe("FEAT-1 — cleanup-policy для компании", () => {
  let ownerSess: { token: string };

  test.beforeAll(async ({ request }) => {
    ownerSess = await registerViaAPI(request, "ROLE_COMPANY_OWNER");
  });

  test("Свежий owner — cleanup_*_after_days = 0 (default)", async ({ request }) => {
    const r = await apiCall(
      request,
      "GET",
      `${API}/company/me`,
      { headers: { Authorization: `Bearer ${ownerSess.token}` } },
      "get-company-me",
    );
    expect(r.ok(), `GET /company/me: ${r.status()}`).toBeTruthy();
    const data = await r.json();
    expect(data.cleanup_vacancies_after_days ?? 0).toBe(0);
    expect(data.cleanup_tasks_after_days ?? 0).toBe(0);
  });

  test("PATCH /company сохраняет cleanup_*_after_days", async ({ request }) => {
    const me = await apiCall(
      request,
      "GET",
      `${API}/company/me`,
      { headers: { Authorization: `Bearer ${ownerSess.token}` } },
      "get-company-me-2",
    );
    const cur = await me.json();
    const r = await apiCall(
      request,
      "PATCH",
      `${API}/company`,
      {
        headers: { Authorization: `Bearer ${ownerSess.token}` },
        data: {
          id: cur.id,
          name: "E2E Cleanup Co",
          cleanup_vacancies_after_days: 45,
          cleanup_tasks_after_days: 90,
        },
      },
      "patch-company-cleanup",
    );
    expect(r.ok(), `PATCH /company: ${r.status()}`).toBeTruthy();

    const back = await apiCall(
      request,
      "GET",
      `${API}/company/me`,
      { headers: { Authorization: `Bearer ${ownerSess.token}` } },
      "get-company-me-3",
    );
    const after = await back.json();
    expect(after.cleanup_vacancies_after_days).toBe(45);
    expect(after.cleanup_tasks_after_days).toBe(90);
  });
});
