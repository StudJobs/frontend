import React, { useEffect, useMemo, useState } from "react";
import { apiGateway } from "../../api/apiGateway";
import type { CompanyDTO } from "./CompanyCarousel";

const isStr = (v: any) => typeof v === "string" && v.trim().length > 0;

async function searchCompanies(query: string): Promise<CompanyDTO[]> {
  const q = query.trim();

  const candidates = [
    { method: "GET", url: "/company", params: q ? { q } : undefined },
    { method: "GET", url: "/companies", params: q ? { q } : undefined },
    { method: "GET", url: "/company/search", params: q ? { q } : undefined },
    { method: "GET", url: "/company/list", params: q ? { q } : undefined },
  ] as const;

  for (const req of candidates) {
    try {
      const resp = await apiGateway({
        method: req.method,
        url: req.url,
        params: req.params as any,
      });
      const data: any = (resp as any)?.data ?? resp ?? {};
      const arr =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.companies) ? data.companies :
        Array.isArray(data?.results) ? data.results :
        [];

      if (Array.isArray(arr)) return arr as CompanyDTO[];
    } catch {
    }
  }

  return [];
}

export default function CompanyPicker({
  alreadyIds,
  onAdd,
}: {
  alreadyIds: string[];
  onAdd: (company: CompanyDTO) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CompanyDTO[]>([]);
  const [error, setError] = useState<string>("");

  const deduped = useMemo(() => {
    const used = new Set(alreadyIds.map(String));
    return items.filter((c) => !used.has(String(c.id || "")));
  }, [items, alreadyIds]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        setLoading(true);
        const res = await searchCompanies(query);
        if (!alive) return;
        setItems(res);
      } catch (e) {
        if (!alive) return;
        setError("Не удалось загрузить список компаний.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [query]);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Добавить компанию в профиль</div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по названию / городу..."
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid #d9d9d9",
          padding: "10px 12px",
          outline: "none",
        }}
      />

      {loading && <div style={{ marginTop: 8, opacity: 0.7 }}>Загрузка…</div>}
      {error && <div style={{ marginTop: 8, color: "#b00020" }}>{error}</div>}

      {!loading && !error && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {deduped.slice(0, 8).map((c) => {
            const id = String(c.id || "");
            const name = c.name || "Компания";

            return (
              <button
                key={id || `${name}_${Math.random()}`}
                type="button"
                onClick={() => onAdd(c)}
                disabled={!isStr(id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  padding: "10px 12px",
                  cursor: isStr(id) ? "pointer" : "not-allowed",
                  textAlign: "left",
                }}
              >
                <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {name}
                  <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>
                    {c.city ? `(${c.city})` : ""}
                  </span>
                </span>
                <span style={{ fontWeight: 800 }}>＋</span>
              </button>
            );
          })}

          {deduped.length === 0 && (
            <div style={{ marginTop: 6, opacity: 0.7 }}>Ничего не найдено.</div>
          )}
        </div>
      )}
    </div>
  );
}
