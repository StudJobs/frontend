import React from "react";

export type CompanyType = { value?: string };

export type CompanyDTO = {
  id?: string;
  name?: string;
  city?: string;
  site?: string;
  description?: string;
  logo_url?: string;
  logo_id?: string;
  type?: CompanyType;
};

const isStr = (v: any) => typeof v === "string" && v.trim().length > 0;

export default function CompanyCarousel({
  items,
  onRemove,
  onOpen,
  title = "Компании",
}: {
  items: CompanyDTO[];
  title?: string;
  onRemove?: (companyId: string) => void;
  onOpen?: (companyId: string) => void;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>

      {items.length === 0 ? (
        <div style={{ opacity: 0.7 }}>—</div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {items.map((c) => {
            const id = String(c.id || "");
            const clickable = !!onOpen && isStr(id);

            return (
              <div
                key={id || `${c.name}_${Math.random()}`}
                style={{
                  minWidth: 260,
                  maxWidth: 260,
                  borderRadius: 18,
                  background: "#fff",
                  boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
                  padding: 14,
                  position: "relative",
                  cursor: clickable ? "pointer" : "default",
                }}
                onClick={() => clickable && onOpen?.(id)}
              >
                {onRemove && isStr(id) && (
                  <button
                    type="button"
                    title="Удалить"
                    aria-label="Удалить"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(id);
                    }}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 10,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1,
                      padding: "2px 6px",
                    }}
                  >
                    ×
                  </button>
                )}

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: "#f2f2f2",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {isStr(c.logo_url) ? (
                      <img
                        src={c.logo_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : null}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={c.name}
                    >
                      {c.name || "Компания"}
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      {c.city || "—"} • {c.type?.value || "—"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                  {isStr(c.site) ? (
                    <span style={{ textDecoration: "underline" }}>{c.site}</span>
                  ) : (
                    "—"
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    opacity: 0.85,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  }}
                  title={c.description}
                >
                  {isStr(c.description) ? c.description : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
