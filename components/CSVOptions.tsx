import type { PackageType, CodType } from "@/types";

interface CSVOptionsProps {
  defaultPackageType: PackageType;
  codType: CodType;
  carrier: string;
  service: string;
  pickupDate: string;
  showWarnings: boolean;
  onPackageTypeChange: (v: PackageType) => void;
  onCodTypeChange: (v: CodType) => void;
  onCarrierChange: (v: string) => void;
  onServiceChange: (v: string) => void;
  onPickupDateChange: (v: string) => void;
  onShowWarningsChange: (v: boolean) => void;
}

export default function CSVOptions({
  defaultPackageType,
  codType,
  carrier,
  service,
  pickupDate,
  showWarnings,
  onPackageTypeChange,
  onCodTypeChange,
  onCarrierChange,
  onServiceChange,
  onPickupDateChange,
  onShowWarningsChange,
}: CSVOptionsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Opzioni CSV</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo di Pacco</label>
          <select
            value={defaultPackageType}
            onChange={(e) => onPackageTypeChange(e.target.value as PackageType)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Pacco">Pacco</option>
            <option value="Busta">Busta</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo Contrassegno</label>
          <select
            value={codType}
            onChange={(e) => onCodTypeChange(e.target.value as CodType)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="A">A (Assicurato)</option>
            <option value="E">E (Contrassegno)</option>
            <option value="D">D (Digitale)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Corriere (Mittente)</label>
          <input
            type="text"
            value={carrier}
            onChange={(e) => onCarrierChange(e.target.value)}
            placeholder="e.g. Nexive"
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Servizio</label>
          <input
            type="text"
            value={service}
            onChange={(e) => onServiceChange(e.target.value)}
            placeholder="e.g. Standard"
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data Ritiro</label>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => onPickupDateChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showWarnings}
              onChange={(e) => onShowWarningsChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Avvisi
          </label>
        </div>
      </div>
    </div>
  );
}
