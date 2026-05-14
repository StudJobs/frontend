import { test, expect } from "@playwright/test";
import { primeAuthInBrowser, registerViaAPI } from "./_helpers";

/**
 * Сценарий 2 ROADMAP: студент. Профиль, ачивки, навыки, страница вакансий,
 * страница «мои отклики». Без e2e-отклика — это в 06.
 */
test.describe("Сценарий 2 — Студент: профиль, портфолио, поиск, отклики (smoke)", () => {
  test("/profile открывается без JS-ошибок и показывает свои блоки", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_STUDENT");
    await primeAuthInBrowser(page, sess);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
    });

    await page.goto("/profile");
    await expect(
      page.getByRole("button", { name: "Редактировать информацию" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("О себе:", { exact: false })).toBeVisible();
    await expect(page.getByText("Навыки:", { exact: false })).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("/vacancies открывается, форма фильтров работает", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_STUDENT");
    await primeAuthInBrowser(page, sess);

    await page.goto("/vacancies");
    await expect(
      page.getByRole("heading", { name: "Вакансии" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Например: Frontend Developer"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Применить" }),
    ).toBeVisible();
  });

  test("/my/applications открывается у студента (роут не 404 и не 403)", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_STUDENT");
    await primeAuthInBrowser(page, sess);

    await page.goto("/my/applications");
    await expect(
      page.getByRole("heading", { name: "Мои отклики" }),
    ).toBeVisible({ timeout: 15_000 });
    // Пустой state ок — главное, что страница не упала.
  });

  test("/tasks (микрозадачи) открывается у студента", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_STUDENT");
    await primeAuthInBrowser(page, sess);

    await page.goto("/tasks");
    await expect(
      page.getByRole("heading", { name: "Микрозадачи" }),
    ).toBeVisible();
  });
});
