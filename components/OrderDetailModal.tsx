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

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function SvgIcon({
  children,
  size = 18,
  color = "currentColor",
  strokeWidth = 1.9,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function IconClipboard({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5h6a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 4.5Z" />
      <path d="M9 10h6M9 14h6M9 18h4" />
    </SvgIcon>
  );
}

function IconShoppingBag({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M6.5 8h11l-1 12h-9l-1-12Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </SvgIcon>
  );
}

function IconBox({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M21 7.5 12 3 3 7.5m18 0v9L12 21m9-13.5-9 4.5m0 9-9-4.5v-9m9 4.5L3 7.5" />
    </SvgIcon>
  );
}

function IconPallet({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="4" y="6" width="16" height="10" rx="2" />
      <path d="M4 16h16M7 16v3m5-3v3m5-3v3" />
    </SvgIcon>
  );
}

function IconBottle({
  size = 18,
  color = "currentColor",
  strokeWidth = 1.9,
  magnum = false,
}: IconProps & { magnum?: boolean }) {
  return magnum ? (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M9 3h6" />
      <path d="M11 3v3l-2.6 3.7c-.4.6-.6 1.2-.6 1.9V18a3 3 0 0 0 3 3h2.4a3 3 0 0 0 3-3v-6.4c0-.7-.2-1.3-.6-1.9L13 6V3" />
    </SvgIcon>
  ) : (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M10 3h4" />
      <path d="M11 3v3.2l-2 3.2c-.3.5-.5 1.1-.5 1.7V18a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-7a3.5 3.5 0 0 0-.5-1.8L13 6.2V3" />
    </SvgIcon>
  );
}

function IconTruck({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M3 8h11v8H3z" />
      <path d="M14 11h4l3 3v2h-7z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="17.5" cy="17" r="1.5" />
    </SvgIcon>
  );
}

function IconReceipt({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </SvgIcon>
  );
}

function IconBanknotes({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.1" />
      <path d="M3 10c1.2 0 2.2-1 2.2-2.2M21 10c-1.2 0-2.2-1-2.2-2.2M3 14c1.2 0 2.2 1 2.2 2.2M21 14c-1.2 0-2.2 1-2.2 2.2" />
    </SvgIcon>
  );
}

function IconMessage({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <circle cx="10" cy="11.5" r="0.7" fill={color} stroke="none" />
      <circle cx="12" cy="11.5" r="0.7" fill={color} stroke="none" />
      <circle cx="14" cy="11.5" r="0.7" fill={color} stroke="none" />
    </SvgIcon>
  );
}

function IconWarning({ size = 18, color = "currentColor", strokeWidth = 1.9 }: IconProps) {
  return (
    <SvgIcon size={size} color={color} strokeWidth={strokeWidth}>
      <path d="M12 4 20 18H4L12 4Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.5" r="0.8" fill={color} stroke="none" />
    </SvgIcon>
  );
}

function packageColor(type: string): {
  bg: string;
  border: string;
  accent: string;
  icon: React.ReactNode;
} {
  if (type.startsWith("PALLET"))
    return {
      bg: "rgba(124,58,237,0.08)",
      border: "rgba(124,58,237,0.25)",
      accent: "#7c3aed",
      icon: <IconPallet size={22} color="#7c3aed" />,
    };
  if (type === "COLLO-MAGNUM")
    return {
      bg: "rgba(220,38,38,0.07)",
      border: "rgba(220,38,38,0.22)",
      accent: "#dc2626",
      icon: <IconBottle size={22} color="#dc2626" magnum />,
    };
  return {
    bg: "rgba(37,99,235,0.07)",
    border: "rgba(37,99,235,0.22)",
    accent: "#2563eb",
    icon: <IconBox size={22} color="#2563eb" />,
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
        <span
          style={{
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
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

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
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
      {icon && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            color: "#6b7280",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}
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
            }}
          >
            <IconClipboard size={22} color="#ffffff" strokeWidth={2} />
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
            <SectionTitle icon={<IconShoppingBag size={14} />}>Prodotti ordinati</SectionTitle>
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
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isMagnum ? (
                        <IconBottle size={18} color="#b91c1c" magnum />
                      ) : (
                        <IconBottle size={17} color="#1d4ed8" />
                      )}
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconBottle size={14} color="#1d4ed8" />
                  {packaging.qty075} bott. 0.75 L
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconBottle size={14} color="#dc2626" magnum />
                  {packaging.qtyMagnum} Magnum
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
            <SectionTitle icon={<IconBox size={14} />}>
              Composizione imballo
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
                {packaging.packages.length === 1
                  ? "1 collo"
                  : `${packaging.packages.length} colli`} · {totalWeight.toFixed(1)} kg tot.
              </span>
            </SectionTitle>

            {/* mode banner */}
            <ModeExplainer mode={packaging.mode} count={packaging.packages.length} />

            <div
              className={
                packaging.packages.length === 1
                  ? "packages-grid packages-grid-single"
                  : "packages-grid"
              }
            >
              {packaging.packages.map((pkg, i) => (
                <PackageCard key={i} pkg={pkg} index={i} />
              ))}
            </div>
          </section>

          {/* ── Shipping & Billing ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <section>
              <SectionTitle icon={<IconTruck size={14} />}>Spedizione</SectionTitle>
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
              <SectionTitle icon={<IconReceipt size={14} />}>Fatturazione</SectionTitle>
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
              <SectionTitle icon={<IconBanknotes size={14} color="#7c3aed" />}>
                Contrassegno (COD)
              </SectionTitle>
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
              <SectionTitle icon={<IconMessage size={14} />}>Note cliente</SectionTitle>
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

        .packages-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        .packages-grid-single {
          grid-template-columns: 1fr;
        }

        @media (max-width: 720px) {
          .packages-grid {
            grid-template-columns: 1fr;
          }
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
  const configs: Record<
    "pallet-alto" | "pallet-basso" | "colli" | "empty",
    {
      icon: React.ReactNode;
      color: string;
      bg: string;
      border: string;
      title: string;
      desc: string;
    }
  > = {
    "pallet-alto": {
      icon: <IconPallet size={18} color="#7c3aed" />,
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.06)",
      border: "rgba(124,58,237,0.2)",
      title: "Pallet Alto",
      desc: "Più di 48 bottiglie → spedizione su pallet alto (75 cm)",
    },
    "pallet-basso": {
      icon: <IconPallet size={18} color="#7c3aed" />,
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.06)",
      border: "rgba(124,58,237,0.2)",
      title: "Pallet Basso",
      desc: "37–48 bottiglie → spedizione su pallet basso (45 cm)",
    },
    colli: {
      icon: <IconBox size={18} color="#2563eb" />,
      color: "#2563eb",
      bg: "rgba(37,99,235,0.06)",
      border: "rgba(37,99,235,0.2)",
      title: count === 1 ? "1 collo separato" : `${count} colli separati`,
      desc: "Fino a 36 bottiglie → spedizione in colli individuali",
    },
    empty: {
      icon: <IconWarning size={18} color="#d97706" />,
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
      <span
        style={{
          width: 20,
          height: 20,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {cfg.icon}
      </span>
      <div>
        <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.title}</span>
        <span style={{ color: "#6b7280", marginLeft: 6 }}>— {cfg.desc}</span>
      </div>
    </div>
  );
}
