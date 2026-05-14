import { test, expect } from "@playwright/test";

/**
 * Дополнительная страница — лендинг и публичные роуты, что не упали.
 * Захватывает дизайн-overhaul (Fraunces+amber) косвенно — если шрифты/токены
 * сломались, hero-блок тоже сломается.
 */
test.describe("Public surface — Home / 404", () => {
  test("/ открывается, hero-заголовок виден, CTA на месте", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Подтверждённые навыки/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Смотреть вакансии" }),
    ).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("несуществующий роут не валит SPA", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto("/this-route-does-not-exist-zzz");
    await page.waitForLoadState("domcontentloaded");
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
