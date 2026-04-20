"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import FilterPanel from "@/components/FilterPanel";
import CSVOptions from "@/components/CSVOptions";
import WarningSummary from "@/components/WarningSummary";
import OrderDetailModal from "@/components/OrderDetailModal";
import { getMissingFieldWarnings } from "@/lib/csv-warnings";
import type { WooOrder, CodType, WarningSummary as OrderWarningSummary } from "@/types";

const TRUCKPOOLING_DASHBOARD_URL = "https://www.truckpooling.it/it/pro/dashboard?";
const AUTO_OPEN_DASHBOARD_PREF_KEY = "wooship_auto_open_dashboard_after_export";

export default function OrdersPage() {
  const router = useRouter();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<WooOrder[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportToken, setExportToken] = useState<string | null>(null);
  const [fetchedOrderIds, setFetchedOrderIds] = useState<number[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // CSV options
  const [includeCod, setIncludeCod] = useState(false);
  const [codType, setCodType] = useState<CodType>("A");
  const [carrier, setCarrier] = useState("");
  const [service, setService] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [showWarnings, setShowWarnings] = useState(true);

  // Warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<OrderWarningSummary[]>([]);

  // Order detail modal state
  const [detailOrder, setDetailOrder] = useState<WooOrder | null>(null);
  const [autoOpenDashboard, setAutoOpenDashboard] = useState(false);
  const [showPostExportPrompt, setShowPostExportPrompt] = useState(false);
  const [rememberDashboardPreference, setRememberDashboardPreference] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("after", new Date(dateFrom).toISOString());
      if (dateTo) params.set("before", new Date(dateTo + "T23:59:59").toISOString());

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Impossibile scaricare gli ordini");
        return;
      }

      setOrders(data.orders);
      setExportToken(data.exportToken);
      const idsFromResponse = Array.isArray(data.fetchedOrderIds)
        ? data.fetchedOrderIds
        : data.orders.map((o: WooOrder) => o.id);
      const uniqueFetchedIds = [...new Set(idsFromResponse)]
        .filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)
        .sort((a, b) => a - b);

      setFetchedOrderIds(uniqueFetchedIds);
      setSelectedIds(new Set(uniqueFetchedIds));
    } catch {
      setError("Errore di rete durante il download degli ordini");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  // Check credentials on mount
  useEffect(() => {
    fetch("/api/credentials")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasCredentials) {
          router.push("/credentials");
        } else {
          fetchOrders();
        }
      })
      .catch(() => router.push("/credentials"));
  }, [router, fetchOrders]);

  useEffect(() => {
    try {
      setAutoOpenDashboard(
        window.localStorage.getItem(AUTO_OPEN_DASHBOARD_PREF_KEY) === "true"
      );
    } catch {
      // Ignore localStorage access errors.
    }
  }, []);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((o) => new Date(o.date_created) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      result = result.filter((o) => new Date(o.date_created) <= to);
    }
    return result;
  }, [orders, statusFilter, dateFrom, dateTo]);

  const visibleOrderIds = useMemo(
    () => filteredOrders.map((order) => order.id),
    [filteredOrders]
  );

  const visibleSelectedCount = useMemo(
    () => visibleOrderIds.filter((id) => selectedIds.has(id)).length,
    [visibleOrderIds, selectedIds]
  );

  const totalSelectedCount = selectedIds.size;
  const hiddenSelectedCount = Math.max(0, totalSelectedCount - visibleSelectedCount);
  const allVisibleSelected =
    visibleOrderIds.length > 0 && visibleSelectedCount === visibleOrderIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  function toggleOrder(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldDeselectVisible = visibleOrderIds.every((id) => next.has(id));

      if (shouldDeselectVisible) {
        visibleOrderIds.forEach((id) => next.delete(id));
      } else {
        visibleOrderIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }

  function keepOnlyVisibleSelection() {
    setSelectedIds((prev) => {
      const next = new Set<number>();
      visibleOrderIds.forEach((id) => {
        if (prev.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }

  function formatDate(isoDate: string) {
    const d = new Date(isoDate);
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function persistAutoOpenDashboardPreference(value: boolean) {
    setAutoOpenDashboard(value);
    try {
      window.localStorage.setItem(AUTO_OPEN_DASHBOARD_PREF_KEY, value ? "true" : "false");
    } catch {
      // Ignore localStorage access errors.
    }
  }

  function openTruckpoolingDashboard() {
    window.open(
      TRUCKPOOLING_DASHBOARD_URL,
      "_blank",
      "noopener,noreferrer,width=1400,height=900"
    );
  }

  function closePostExportPrompt() {
    setShowPostExportPrompt(false);
    setRememberDashboardPreference(false);
  }

  function handleOpenDashboardNow() {
    if (rememberDashboardPreference) {
      persistAutoOpenDashboardPreference(true);
    }
    openTruckpoolingDashboard();
    closePostExportPrompt();
  }

  async function handleDownload() {
    const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
    const orderWarnings = getMissingFieldWarnings(selectedOrders);

    if (orderWarnings.length > 0 && showWarnings) {
      setWarnings(orderWarnings);
      setShowWarningModal(true);
      return;
    }

    await downloadCSV(selectedOrders);
  }

  async function downloadCSV(selectedOrders: WooOrder[]) {
    if (!exportToken || fetchedOrderIds.length === 0) {
      setError("Sessione scaduta. Per favore ricarica gli ordini.");
      return;
    }

    const selectedOrderIds = [...new Set(selectedOrders.map((o) => o.id))].sort(
      (a, b) => a - b
    );

    setIsExporting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          fetchedOrderIds,
          exportToken,
          options: {
            defaultPackageType: "Pacco",
            includeCod,
            codType,
            carrier,
            service,
            pickupDate,
          },
        }),
      });

      if (res.status === 403) {
        setError("Token di esportazione scaduto. Ricarica gli ordini.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Esportazione fallita");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wooship-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (autoOpenDashboard) {
        openTruckpoolingDashboard();
      } else {
        setShowPostExportPrompt(true);
      }
    } catch {
      setError("Errore di rete durante l'esportazione");
    } finally {
      setIsExporting(false);
      setShowWarningModal(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ordini</h1>
            <p className="text-sm text-gray-500 mt-1">
              Seleziona gli ordini e scaricali come frammento CSV per il tuo software di spedizione.
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading && <span className="wooship-spinner" aria-hidden="true"></span>}
            <span>{isLoading ? "Caricamento in corso..." : "Aggiorna Ordini"}</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="wooship-skeleton-card"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="wooship-skeleton-line w-40"></div>
                <div className="wooship-skeleton-line w-28"></div>
                <div className="wooship-skeleton-line w-56 hidden sm:block"></div>
              </div>
            ))}
          </div>
        )}

        {/* Filter panel */}
        {!isLoading && orders.length > 0 && (
          <>
            <div className="mb-4">
              <FilterPanel
                onStatusChange={setStatusFilter}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                currentStatus={statusFilter}
                dateFrom={dateFrom}
                dateTo={dateTo}
                orders={filteredOrders}
              />
            </div>

            {/* CSV Options */}
            <div className="mb-4">
              <CSVOptions
                includeCod={includeCod}
                codType={codType}
                carrier={carrier}
                service={service}
                pickupDate={pickupDate}
                showWarnings={showWarnings}
                onIncludeCodChange={setIncludeCod}
                onCodTypeChange={setCodType}
                onCarrierChange={setCarrier}
                onServiceChange={setService}
                onPickupDateChange={setPickupDate}
                onShowWarningsChange={setShowWarnings}
              />
            </div>
          </>
        )}

        {/* Order Table */}
        {!isLoading && filteredOrders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-gray-600">
                Selezionati: <strong>{visibleSelectedCount}</strong> visibili su <strong>{totalSelectedCount}</strong> totali
              </span>
              {hiddenSelectedCount > 0 && (
                <button
                  type="button"
                  onClick={keepOnlyVisibleSelection}
                  className="text-blue-700 hover:text-blue-800 font-medium"
                >
                  Rimuovi {hiddenSelectedCount} fuori filtro
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        aria-label="Seleziona o deseleziona tutti gli ordini visibili"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Ordine #</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Stato</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Totale</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Contrassegno (COD)</th>
                     <th className="px-4 py-3 text-left font-medium text-gray-700">Dettaglio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => {
                    const isCOD = order.payment_method === "cod";
                    const hasWarning =
                      !order.shipping.address_1 ||
                      !order.shipping.postcode ||
                      !order.shipping.city ||
                      !order.shipping.country ||
                      !order.shipping.last_name;

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-gray-50 ${hasWarning ? "bg-amber-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleOrder(order.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-900">
                          #{order.number}
                          {hasWarning && (
                            <span className="ml-2 text-xs text-amber-600">(dati mancanti)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(order.date_created)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {order.billing.first_name} {order.billing.last_name}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {order.currency_symbol}{order.total}
                        </td>
                        <td className="px-4 py-3">
                          {isCOD && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              COD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            id={`detail-btn-${order.id}`}
                            onClick={() => setDetailOrder(order)}
                            title="Visualizza dettaglio ordine"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 active:scale-95 transition-all"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            Dettaglio
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && orders.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-500">Nessun ordine trovato.</p>
            <p className="text-sm text-gray-400 mt-1">Clicca &quot;Aggiorna Ordini&quot; per caricarli da WooCommerce.</p>
          </div>
        )}

        {/* Download bar */}
        {totalSelectedCount > 0 && (
          <div className="wooship-download-bar fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl bg-white/80 backdrop-blur-md border border-gray-200/50 p-4 rounded-2xl shadow-2xl z-50 transition-all duration-300">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center bg-blue-100 text-blue-700 font-bold w-8 h-8 rounded-full">
                  {totalSelectedCount}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    ordin{totalSelectedCount !== 1 ? "i" : "e"} selezionat{totalSelectedCount !== 1 ? "i" : "o"}
                  </p>
                  {hiddenSelectedCount > 0 && (
                    <p className="text-xs text-amber-700">
                      {hiddenSelectedCount} non visibil{hiddenSelectedCount !== 1 ? "i" : "e"} con i filtri attivi
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDownload}
                disabled={isExporting}
                className={`min-w-[190px] inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md ${isExporting ? "wooship-exporting" : ""}`}
              >
                {isExporting && <span className="wooship-spinner" aria-hidden="true"></span>}
                <span>{isExporting ? "Preparazione CSV..." : "Scarica CSV"}</span>
              </button>
            </div>
            {isExporting && (
              <div className="mt-3 px-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="wooship-export-progress h-full w-1/3 bg-gray-900 rounded-full"></div>
                </div>
              </div>
            )}
            <div className="mt-3 px-2 pt-3 border-t border-gray-200/70">
              <label className="inline-flex items-center gap-2 text-xs text-gray-600 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOpenDashboard}
                  onChange={(e) => persistAutoOpenDashboardPreference(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Apri automaticamente la dashboard Truckpooling dopo ogni export
              </label>
            </div>
          </div>
        )}
      </main>

      {/* Post export prompt */}
      {showPostExportPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Esportazione completata</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Vuoi aprire la dashboard di Truckpooling in una nuova finestra?
              </p>
              <p className="text-xs text-gray-500 mb-4 break-all">
                {TRUCKPOOLING_DASHBOARD_URL}
              </p>
              <label className="inline-flex items-start gap-2 text-sm text-gray-700 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDashboardPreference}
                  onChange={(e) => setRememberDashboardPreference(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Ricorda la scelta e apri automaticamente dopo ogni export</span>
              </label>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3 justify-end">
              <button
                onClick={closePostExportPrompt}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Non ora
              </button>
              <button
                onClick={handleOpenDashboardNow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apri dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning modal */}
      {showWarningModal && (
        <WarningSummary
          warnings={warnings}
          onProceed={() => downloadCSV(orders.filter((o) => selectedIds.has(o.id)))}
          onCancel={() => setShowWarningModal(false)}
        />
      )}

      {/* Order detail modal */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    "on-hold": "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    refunded: "bg-gray-100 text-gray-800",
    failed: "bg-red-100 text-red-800",
    trash: "bg-gray-100 text-gray-800",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
