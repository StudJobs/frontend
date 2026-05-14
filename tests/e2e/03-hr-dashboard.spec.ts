import { test, expect } from "@playwright/test";
import { primeAuthInBrowser, registerViaAPI } from "./_helpers";

/**
 * Сценарий 3 ROADMAP: HR. Дашборд + создание вакансии + ревью откликов.
 * Здесь только smoke страниц, e2e (создание + взаимодействие со студентом)
 * в отдельных серилизованных файлах 06/07.
 */
test.describe("Сценарий 3 — HR: дашборд и smoke страниц", () => {
  test("/hr (HR Dashboard) открывается у COMPANY_OWNER, метрики на месте", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_COMPANY_OWNER");
    await primeAuthInBrowser(page, sess);

    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));

    await page.goto("/hr");
    await expect(
      page.getByRole("heading", { name: "Сегодня. Кратко." }),
    ).toBeVisible({ timeout: 15_000 });

    for (const tile of [
      "Активные вакансии",
      "Микрозадачи в работе",
      "Решений ждут ревью",
      "Отклики ждут ответа",
    ]) {
      await expect(page.getByText(tile, { exact: true })).toBeVisible();
    }

    // Только runtime-ошибки JS должны валить (404 на API известны как баг — фиксируется отдельно)
    expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  });

  test("/hr/tasks открывается у HR (form для создания микрозадачи)", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_COMPANY_OWNER");
    await primeAuthInBrowser(page, sess);

    await page.goto("/hr/tasks");
    // Заголовок страницы не зафиксирован — ищем кнопку "Создать" как канареечный признак формы.
    await expect(
      page
        .getByRole("button", { name: "Создать" })
        .or(page.getByRole("button", { name: "Создать задачу" })),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("/hr/applications без vacancy_id не падает", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_COMPANY_OWNER");
    await primeAuthInBrowser(page, sess);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto("/hr/applications");
    // Допустимы и заголовок, и пустой state, и редирект — главное что не белый экран.
    await page.waitForLoadState("domcontentloaded");
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("HR не имеет доступа к /profile (студенческой странице)", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_COMPANY_OWNER");
    await primeAuthInBrowser(page, sess);

    await page.goto("/profile");
    // PrivateRoute должен либо редиректнуть на /hr, либо показать «нет доступа».
    await page.waitForTimeout(1500);
    expect(page.url()).not.toMatch(/\/profile$/);
  });
});
