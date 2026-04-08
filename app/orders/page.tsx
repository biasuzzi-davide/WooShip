"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import FilterPanel from "@/components/FilterPanel";
import CSVOptions from "@/components/CSVOptions";
import WarningSummary from "@/components/WarningSummary";
import type { WooOrder, PackageType, CodType } from "@/types";

// Inline warning check (avoiding server-side lib imports in client component)
function getWarnings(orders: WooOrder[]) {
  const w: { orderId: number; orderNumber: string; missingFields: string[] }[] = [];
  for (const o of orders) {
    const missing: string[] = [];
    if (!o.shipping.address_1?.trim()) missing.push("to_street");
    if (!o.shipping.postcode?.trim()) missing.push("to_zip");
    if (!o.shipping.city?.trim()) missing.push("to_city");
    if (!o.shipping.country?.trim()) missing.push("to_country");
    if (!o.shipping.last_name?.trim()) missing.push("to_last_name");
    if (missing.length > 0) w.push({ orderId: o.id, orderNumber: o.number, missingFields: missing });
  }
  return w;
}

export default function OrdersPage() {
  const router = useRouter();
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
  const [packageType, setPackageType] = useState<PackageType>("Pacco");
  const [codType, setCodType] = useState<CodType>("A");
  const [carrier, setCarrier] = useState("");
  const [service, setService] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [showWarnings, setShowWarnings] = useState(true);

  // Modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<ReturnType<typeof getWarnings>>([]);

  // Check credentials on mount
  useEffect(() => {
    fetch("/api/credentials")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasCredentials) {
          router.push("/credentials");
        }
      })
      .catch(() => router.push("/credentials"));
  }, [router]);

  async function fetchOrders() {
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
        setError(data.error ?? "Failed to fetch orders");
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
      setError("Network error while fetching orders");
    } finally {
      setIsLoading(false);
    }
  }

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

  function toggleOrder(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleAll() {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  }

  function formatDate(isoDate: string) {
    const d = new Date(isoDate);
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function handleDownload() {
    const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
    const orderWarnings = getWarnings(selectedOrders);

    if (orderWarnings.length > 0 && showWarnings) {
      setWarnings(orderWarnings);
      setShowWarningModal(true);
      return;
    }

    await downloadCSV(selectedOrders);
  }

  async function downloadCSV(selectedOrders: WooOrder[]) {
    if (!exportToken || fetchedOrderIds.length === 0) {
      setError("Session expired. Please re-fetch orders.");
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
            defaultPackageType: packageType,
            codType,
            carrier,
            service,
            pickupDate,
          },
        }),
      });

      if (res.status === 403) {
        setError("Export token expired. Please re-fetch orders.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spedizione-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error during export");
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
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              Select orders and download as CSV for your shipping software.
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Fetch Orders"}
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
          <div className="space-y-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
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
                defaultPackageType={packageType}
                codType={codType}
                carrier={carrier}
                service={service}
                pickupDate={pickupDate}
                showWarnings={showWarnings}
                onPackageTypeChange={setPackageType}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredOrders.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Order #</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">COD</th>
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
                            <span className="ml-2 text-xs text-amber-600">(missing data)</span>
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
            <p className="text-gray-500">No orders found.</p>
            <p className="text-sm text-gray-400 mt-1">Click &quot;Fetch Orders&quot; to load from WooCommerce.</p>
          </div>
        )}

        {/* Download bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedIds.size} order{selectedIds.size !== 1 ? "s" : ""} selected
              </p>
              <button
                onClick={handleDownload}
                disabled={isExporting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isExporting ? "Generating..." : "Download CSV"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Warning modal */}
      {showWarningModal && (
        <WarningSummary
          warnings={warnings}
          onProceed={() => downloadCSV(orders.filter((o) => selectedIds.has(o.id)))}
          onCancel={() => setShowWarningModal(false)}
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
