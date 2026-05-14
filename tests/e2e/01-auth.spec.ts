import { test, expect } from "@playwright/test";
import { registerViaAPI, loginViaAPI, uniqueEmail } from "./_helpers";

/**
 * Сценарий 1 ROADMAP: регистрация и логин 4 ролей.
 * Проверяем оба слоя: API-смок + UI-логин для STUDENT (один путь, чтобы убедиться,
 * что форма Auth.tsx живая и не сломалась).
 */
test.describe("Сценарий 1 — Регистрация и логин 4 ролей", () => {
  for (const role of [
    "ROLE_STUDENT",
    "ROLE_EMPLOYER",
    "ROLE_COMPANY_OWNER",
    "ROLE_EXPERT",
  ] as const) {
    test(`API: register + login as ${role}`, async ({ request }) => {
      const sess = await registerViaAPI(request, role);
      expect(sess.token).toBeTruthy();
      expect(sess.uuid).toBeTruthy();
      const re = await loginViaAPI(request, sess.email, sess.password, role);
      expect(re.token).toBeTruthy();
      expect(re.uuid).toBe(sess.uuid);
    });
  }

  test("UI: страница /auth загружается и показывает форму логина", async ({
    page,
  }) => {
    await page.goto("/auth");
    await expect(
      page.getByRole("heading", { name: "Авторизация" }),
    ).toBeVisible();
    const form = page.locator("form");
    await expect(
      form.getByPlaceholder("Введите логин, почту или телефон..."),
    ).toBeVisible();
    await expect(form.getByPlaceholder("Введите пароль...")).toBeVisible();
    await expect(form.getByRole("button", { name: "Войти" })).toBeVisible();
  });

  test("UI: студент логинится через форму /auth и попадает в /profile", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("ui-login");
    await registerViaAPI(request, "ROLE_STUDENT", email);

    await page.goto("/auth");
    const form = page.locator("form");
    await form
      .getByPlaceholder("Введите логин, почту или телефон...")
      .fill(email);
    await form.getByPlaceholder("Введите пароль...").fill("Pass1234");
    await form.getByRole("button", { name: "Войти" }).click();

    await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
      timeout: 10_000,
    });
    expect(page.url()).toContain("/profile");
  });

  test("UI: страница /auth?mode=register показывает форму регистрации", async ({
    page,
  }) => {
    await page.goto("/auth?mode=register");
    await expect(
      page.getByRole("heading", { name: "Регистрация" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Зарегистрироваться" }),
    ).toBeVisible();
    for (const role of ["Кандидат", "Работодатель", "Компания", "Эксперт"]) {
      await expect(page.getByText(role, { exact: true })).toBeVisible();
    }
  });
});
