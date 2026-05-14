import { test, expect } from "@playwright/test";
import { primeAuthInBrowser, registerViaAPI } from "./_helpers";

/**
 * Сценарий 4 ROADMAP: эксперт. Очередь верификации портфолио.
 * E2E approve покрыт в 06 (создание ачивки требует upload файла, дорого).
 * Здесь — что страница открывается и не падает.
 */
test.describe("Сценарий 4 — Эксперт: очередь верификации (smoke)", () => {
  test("/expert открывается у ROLE_EXPERT, видна шапка и кнопка обновить", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_EXPERT");
    await primeAuthInBrowser(page, sess);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
    });

    await page.goto("/expert");
    await expect(
      page.getByRole("heading", { name: /экспертной проверки/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "Обновить" }),
    ).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("эксперт не имеет доступа к /hr (HR-страницам)", async ({
    page,
    request,
  }) => {
    const sess = await registerViaAPI(request, "ROLE_EXPERT");
    await primeAuthInBrowser(page, sess);

    await page.goto("/hr");
    await page.waitForTimeout(1500);
    expect(page.url()).not.toMatch(/\/hr$/);
  });
});
