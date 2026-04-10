"use client";

import { useEffect, useCallback } from "react";
import type { WooOrder } from "@/types";
import { getPackagingForOrder, type PackageInfo } from "@/lib/packaging";

interface Props {
  order: WooOrder;
  onClose: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: string | number, currency = "") {
  return `${currency}${n}`;
}

function packageLabel(type: string) {
  const map: Record<string, string> = {
    "PALLET-ALTO": "Pallet Alto",
    "PALLET-BASSO": "Pallet Basso",
    "COLLO-MAGNUM": "Collo Magnum",
    "COLLO-075-S": "Collo Singolo",
    "COLLO-075-M": "Collo Medio",
    "COLLO-075-L": "Collo Grande",
    "COLLO-STANDARD": "Collo Standard",
  };
  return map[type] ?? type;
}

function packageColor(type: string): { bg: string; border: string; accent: string; icon: string } {
  if (type.startsWith("PALLET"))
    return {
      bg: "rgba(124,58,237,0.08)",
      border: "rgba(124,58,237,0.25)",
      accent: "#7c3aed",
      icon: "🏗️",
    };
  if (type === "COLLO-MAGNUM")
    return {
      bg: "rgba(220,38,38,0.07)",
      border: "rgba(220,38,38,0.22)",
      accent: "#dc2626",
      icon: "🍾",
    };
  return {
    bg: "rgba(37,99,235,0.07)",
    border: "rgba(37,99,235,0.22)",
    accent: "#2563eb",
    icon: "📦",
  };
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PackageCard({ pkg, index }: { pkg: PackageInfo; index: number }) {
  const { bg, border, accent, icon } = packageColor(pkg.type);
  const hasDims = pkg.width && pkg.height && pkg.depth;

  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: accent }}>
            {packageLabel(pkg.type)}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
            Collo #{index + 1}
          </div>
        </div>
        <div
          style={{
            background: accent,
            color: "#fff",
            borderRadius: 8,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {pkg.weight.toFixed(1)} kg
        </div>
      </div>

      {/* stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: hasDims ? "1fr 1fr 1fr 1fr" : "1fr",
          gap: 6,
          marginTop: 4,
        }}
      >
        {hasDims && (
          <>
            <Stat label="H" value={`${pkg.height} cm`} />
            <Stat label="L" value={`${pkg.width} cm`} />
            <Stat label="P" value={`${pkg.depth} cm`} />
          </>
        )}
        {pkg.bottleCount != null && (
          <Stat
            label={pkg.bottleType === "magnum" ? "Magnum" : "Bott."}
            value={String(pkg.bottleCount)}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.6)",
        borderRadius: 8,
        padding: "5px 8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#6b7280",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
      <span style={{ color: "#9ca3af", minWidth: 90 }}>{label}</span>
      <span style={{ color: "#1f2937", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── main modal ───────────────────────────────────────────────────────────────

export default function OrderDetailModal({ order, onClose }: Props) {
  const packaging = getPackagingForOrder(order);
  const isCOD = order.payment_method === "cod";

  // close on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const totalWeight = packaging.packages.reduce((s, p) => s + p.weight, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
          animation: "fadeIn 0.18s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: "min(92vw, 720px)",
          maxHeight: "88vh",
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          boxShadow: "0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg,#1e40af,#3b82f6)",
              borderRadius: 12,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 20,
            }}
          >
            📋
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
              Ordine #{order.number}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {order.billing.first_name} {order.billing.last_name} ·{" "}
              {new Date(order.date_created).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          {/* badges */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {isCOD && (
              <span
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                COD
              </span>
            )}
            <span
              style={{
                background: "#f3f4f6",
                color: "#374151",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {order.currency_symbol}
              {order.total}
            </span>
          </div>

          {/* close btn */}
          <button
            onClick={onClose}
            aria-label="Chiudi"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 8,
              color: "#9ca3af",
              fontSize: 20,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── Products ── */}
          <section>
            <SectionTitle>🛍️ Prodotti ordinati</SectionTitle>
            <div
              style={{
                background: "#f9fafb",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              {(order.line_items ?? []).map((item, i) => {
                const isMagnum = item.name?.toLowerCase().includes("magnum");
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 14px",
                      borderBottom: i < (order.line_items?.length ?? 0) - 1 ? "1px solid #e5e7eb" : "none",
                      background: i % 2 === 1 ? "rgba(243,244,246,0.5)" : "transparent",
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {isMagnum ? "🍾" : "🍷"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1f2937",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </div>
                      {item.sku && (
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>SKU: {item.sku}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span
                        style={{
                          background: isMagnum ? "rgba(220,38,38,0.1)" : "rgba(37,99,235,0.1)",
                          color: isMagnum ? "#dc2626" : "#1d4ed8",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        ×{item.quantity}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", minWidth: 56, textAlign: "right" }}>
                        {order.currency_symbol}{item.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* bottle summary row */}
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {packaging.qty075 > 0 && (
                <div
                  style={{
                    background: "rgba(37,99,235,0.08)",
                    border: "1px solid rgba(37,99,235,0.2)",
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1d4ed8",
                  }}
                >
                  🍷 {packaging.qty075} bott. 0.75 L
                </div>
              )}
              {packaging.qtyMagnum > 0 && (
                <div
                  style={{
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#dc2626",
                  }}
                >
                  🍾 {packaging.qtyMagnum} Magnum
                </div>
              )}
              <div
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#059669",
                }}
              >
                Totale {packaging.totalBottles} bott.
              </div>
            </div>
          </section>

          {/* ── Packaging breakdown ── */}
          <section>
            <SectionTitle>
              📦 Composizione imballo
              <span
                style={{
                  marginLeft: "auto",
                  background: "#f3f4f6",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#374151",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                {packaging.packages.length} collo{packaging.packages.length !== 1 ? "i" : ""} · {totalWeight.toFixed(1)} kg tot.
              </span>
            </SectionTitle>

            {/* mode banner */}
            <ModeExplainer mode={packaging.mode} count={packaging.packages.length} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: packaging.packages.length === 1 ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 10,
                marginTop: 10,
              }}
            >
              {packaging.packages.map((pkg, i) => (
                <PackageCard key={i} pkg={pkg} index={i} />
              ))}
            </div>
          </section>

          {/* ── Shipping & Billing ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <section>
              <SectionTitle>🚚 Spedizione</SectionTitle>
              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <InfoRow
                  label="Nominativo"
                  value={`${order.shipping.first_name} ${order.shipping.last_name}`.trim()}
                />
                <InfoRow label="Indirizzo" value={order.shipping.address_1} />
                {order.shipping.address_2 && (
                  <InfoRow label="c/o" value={order.shipping.address_2} />
                )}
                <InfoRow
                  label="Città"
                  value={`${order.shipping.postcode} ${order.shipping.city}`.trim()}
                />
                <InfoRow label="Prov." value={order.shipping.state} />
                <InfoRow label="Paese" value={order.shipping.country} />
                {order.shipping.phone && (
                  <InfoRow label="Tel." value={order.shipping.phone} />
                )}
              </div>
            </section>

            <section>
              <SectionTitle>🧾 Fatturazione</SectionTitle>
              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <InfoRow
                  label="Nominativo"
                  value={`${order.billing.first_name} ${order.billing.last_name}`.trim()}
                />
                {order.billing.company && (
                  <InfoRow label="Azienda" value={order.billing.company} />
                )}
                <InfoRow label="Indirizzo" value={order.billing.address_1} />
                <InfoRow
                  label="Città"
                  value={`${order.billing.postcode} ${order.billing.city}`.trim()}
                />
                <InfoRow label="Email" value={order.billing.email} />
                <InfoRow label="Tel." value={order.billing.phone} />
                {order.billing.tax_id && (
                  <InfoRow label="P.IVA / CF" value={order.billing.tax_id} />
                )}
              </div>
            </section>
          </div>

          {/* ── COD detail ── */}
          {isCOD && (
            <section>
              <SectionTitle>💜 Contrassegno (COD)</SectionTitle>
              <div
                style={{
                  background: "rgba(124,58,237,0.05)",
                  border: "1.5px solid rgba(124,58,237,0.2)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <InfoRow label="Importo" value={fmt(order.total, order.currency_symbol)} />
                <InfoRow label="Metodo" value={order.payment_method_title} />
                <InfoRow
                  label="Intestatario"
                  value={`${order.billing.first_name} ${order.billing.last_name}`}
                />
                <InfoRow label="Città" value={order.billing.city} />
              </div>
            </section>
          )}

          {/* ── Note ── */}
          {order.customer_note && (
            <section>
              <SectionTitle>💬 Note cliente</SectionTitle>
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#92400e",
                  lineHeight: 1.5,
                }}
              >
                {order.customer_note}
              </div>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "#1f2937",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Chiudi
          </button>
        </div>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

// ── Mode explainer banner ─────────────────────────────────────────────────────

function ModeExplainer({
  mode,
  count,
}: {
  mode: "pallet-alto" | "pallet-basso" | "colli" | "empty";
  count: number;
}) {
  const configs = {
    "pallet-alto": {
      icon: "🏗️",
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.06)",
      border: "rgba(124,58,237,0.2)",
      title: "Pallet Alto",
      desc: "Più di 48 bottiglie → spedizione su pallet alto (75 cm)",
    },
    "pallet-basso": {
      icon: "🏗️",
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.06)",
      border: "rgba(124,58,237,0.2)",
      title: "Pallet Basso",
      desc: "37–48 bottiglie → spedizione su pallet basso (45 cm)",
    },
    colli: {
      icon: "📦",
      color: "#2563eb",
      bg: "rgba(37,99,235,0.06)",
      border: "rgba(37,99,235,0.2)",
      title: `${count} collo${count !== 1 ? "i" : ""} separato${count !== 1 ? "i" : ""}`,
      desc: "Fino a 36 bottiglie → spedizione in colli individuali",
    },
    empty: {
      icon: "⚠️",
      color: "#d97706",
      bg: "rgba(217,119,6,0.06)",
      border: "rgba(217,119,6,0.2)",
      title: "Collo standard",
      desc: "Nessuna bottiglia rilevata — collo generico assegnato",
    },
  };

  const cfg = configs[mode];

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
      }}
    >
      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
      <div>
        <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.title}</span>
        <span style={{ color: "#6b7280", marginLeft: 6 }}>— {cfg.desc}</span>
      </div>
    </div>
  );
}
