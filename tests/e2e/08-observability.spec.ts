import { test, expect } from "@playwright/test";

/**
 * Сценарий 7 ROADMAP: Prometheus + Grafana, /metrics на 9 сервисах,
 * Redis cache-aside, rate-limiting. Тут — HTTP-смок /metrics endpoint'ов.
 * (k6 запускает юзер отдельно через `make loadtest`.)
 */

const services = [
  { name: "API-Gateway", port: 9091 },
  { name: "Auth", port: 9092 },
  { name: "Users", port: 9093 },
  { name: "Achievements", port: 9094 },
  { name: "Vacancy", port: 9095 },
  { name: "Company", port: 9096 },
  { name: "Skills", port: 9097 },
  { name: "Search", port: 9098 },
  { name: "MicroTasks", port: 9099 },
];

test.describe("Сценарий 7 — Observability /metrics smoke", () => {
  for (const s of services) {
    test(`${s.name} (:${s.port}) отдаёт Prometheus-метрики`, async ({
      request,
    }) => {
      const r = await request.get(`http://localhost:${s.port}/metrics`);
      expect(r.ok(), `${s.name} /metrics ${r.status()}`).toBeTruthy();
      const body = await r.text();
      // Должен быть минимум один Prometheus help-комментарий
      expect(body).toContain("# HELP ");
    });
  }
});
