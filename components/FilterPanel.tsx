import type { WooOrder } from "@/types";

interface FilterPanelProps {
  onStatusChange: (status: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  currentStatus: string;
  dateFrom: string;
  dateTo: string;
  orders: WooOrder[];
}

const STATUS_OPTIONS = [
  { value: "", label: "Tutti gli stati" },
  { value: "pending", label: "In attesa" },
  { value: "processing", label: "In lavorazione" },
  { value: "on-hold", label: "In sospeso" },
  { value: "completed", label: "Completato" },
  { value: "cancelled", label: "Annullato" },
  { value: "refunded", label: "Rimborsato" },
  { value: "failed", label: "Fallito" },
];

export default function FilterPanel({
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  currentStatus,
  dateFrom,
  dateTo,
  orders,
}: FilterPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Stato</label>
          <select
            value={currentStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Dal</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Al</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Visualizzati {orders.length} ordin{orders.length !== 1 ? "i" : "e"}
      </div>
    </div>
  );
}
