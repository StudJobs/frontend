import { Page, APIRequestContext, expect } from "@playwright/test";

export const API = "http://localhost:8000/api/v1";

export type Role =
  | "ROLE_STUDENT"
  | "ROLE_EMPLOYER"
  | "ROLE_COMPANY_OWNER"
  | "ROLE_EXPERT";

export type AuthSession = {
  email: string;
  password: string;
  role: Role;
  token: string;
  uuid: string;
};

let counter = 0;

export function uniqueEmail(tag: string): string {
  counter += 1;
  const ts = Date.now();
  return `e2e-${tag}-${ts}-${counter}@studjobs.local`;
}

async function postWithBackoff(
  request: APIRequestContext,
  url: string,
  data: any,
  ctx: string,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await request.post(url, { data });
    if (res.status() !== 429) {
      expect(res.ok(), `${ctx}: ${res.status()} ${await res.text()}`).toBeTruthy();
      return res;
    }
    // 429 — token-bucket в Gateway. Ждём retry_after или 1.5s.
    let wait = 1500;
    try {
      const body = await res.json();
      if (body.retry_after) wait = (body.retry_after + 1) * 1000;
    } catch {}
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`${ctx}: rate-limited after 5 retries`);
}

/**
 * Универсальный fetch с backoff на 429. Используем во всех e2e-вызовах,
 * чтобы Gateway-rate-limiter (100 req/min per IP) не валил серилизованные сценарии.
 */
export async function apiCall(
  request: APIRequestContext,
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT",
  url: string,
  init: { headers?: Record<string, string>; data?: any } = {},
  ctx?: string,
) {
  const label = ctx ?? `${method} ${url}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await request.fetch(url, {
      method,
      headers: init.headers,
      data: init.data,
    });
    if (res.status() !== 429) {
      return res;
    }
    let wait = 1500;
    try {
      const body = await res.json();
      if (body.retry_after) wait = (body.retry_after + 1) * 1000;
    } catch {}
    if (attempt === 4) {
      throw new Error(`${label}: rate-limited after 5 retries`);
    }
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`${label}: unreachable`);
}

export async function registerViaAPI(
  request: APIRequestContext,
  role: Role,
  emailOverride?: string,
): Promise<AuthSession> {
  const email = emailOverride ?? uniqueEmail(role.replace("ROLE_", "").toLowerCase());
  const password = "Pass1234";
  const res = await postWithBackoff(
    request,
    `${API}/auth/register`,
    { email, password, role },
    `register ${role} ${email}`,
  );
  const body = await res.json();
  return { email, password, role, token: body.token, uuid: body.user_uuid };
}

export async function loginViaAPI(
  request: APIRequestContext,
  email: string,
  password: string,
  role: Role,
): Promise<AuthSession> {
  const res = await postWithBackoff(
    request,
    `${API}/auth/login`,
    { email, password, role },
    `login ${email}`,
  );
  const body = await res.json();
  return { email, password, role, token: body.token, uuid: body.user_uuid };
}

/**
 * Visits the app once (so localStorage origin exists), then injects auth keys
 * the way the frontend stores them after a real login.
 */
export async function primeAuthInBrowser(page: Page, sess: AuthSession) {
  await page.goto("/");
  await page.evaluate((s) => {
    localStorage.setItem("token", s.token);
    localStorage.setItem("user_uuid", s.uuid);
    localStorage.setItem("email", s.email);
    localStorage.setItem("role", s.role);
    const map: Record<string, string> = {};
    map[s.email] = s.role;
    localStorage.setItem("userRoles", JSON.stringify(map));
    localStorage.setItem("onboarding_dismissed", "1");
  }, sess);
}

export async function dismissOnboardingIfShown(page: Page) {
  const skip = page.getByRole("button", { name: "Пропустить" });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}
