import type { CodType } from "@/types";

interface CSVOptionsProps {
  includeCod: boolean;
  codType: CodType;
  carrier: string;
  service: string;
  pickupDate: string;
  showWarnings: boolean;
  onIncludeCodChange: (v: boolean) => void;
  onCodTypeChange: (v: CodType) => void;
  onCarrierChange: (v: string) => void;
  onServiceChange: (v: string) => void;
  onPickupDateChange: (v: string) => void;
  onShowWarningsChange: (v: boolean) => void;
}

interface HelpTooltipProps {
  tooltipId: string;
  label: string;
  tooltip: string;
  align?: "left" | "right";
}

function HelpTooltip({ tooltipId, label, tooltip, align = "left" }: HelpTooltipProps) {
  const alignClass = align === "right" ? "right-0" : "left-0";

  return (
    <div className="relative group/tooltip">
      <button
        type="button"
        aria-label={`Aiuto per ${label}`}
        aria-describedby={tooltipId}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="8" />
          <path d="M10 14v-4" strokeLinecap="round" />
          <circle cx="10" cy="6" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none invisible absolute ${alignClass} top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100`}
      >
        {tooltip}
      </div>
    </div>
  );
}

interface FieldHelpLabelProps {
  htmlFor: string;
  label: string;
  tooltip: string;
}

function FieldHelpLabel({ htmlFor, label, tooltip }: FieldHelpLabelProps) {
  const tooltipId = `${htmlFor}-tooltip`;

  return (
    <div className="mb-1 flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-500">
        {label}
      </label>
      <HelpTooltip tooltipId={tooltipId} label={label} tooltip={tooltip} />
    </div>
  );
}

function formatPickupPreview(dateValue: string): string {
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateValue;

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

const CSV_HELP = {
  codToggle:
    "Attiva questa opzione solo quando vuoi compilare nel CSV i campi cod_type, cod_value e cod_*.",
  codType:
    "Compila cod_type solo per ordini in contrassegno. In questo export: A=assicurato, E=contrassegno standard, D=contrassegno digitale.",
  carrier:
    "Nome corriere predefinito nel campo carrier (es. UPS, GLS). Lascia vuoto se vuoi sceglierlo manualmente in piattaforma.",
  service:
    "Servizio predefinito nel campo service (es. Standard o Express). Inseriscilo solo se compatibile col corriere scelto.",
  pickupDate:
    "Data ritiro opzionale. Se valorizzata, l'app la converte in formato GG/MM/AAAA richiesto da Truckpooling.",
  showWarnings:
    "Controlla prima dell'export i campi obbligatori mancanti: to_street, to_zip, to_city, to_country, to_last_name.",
} as const;

export default function CSVOptions({
  includeCod,
  codType,
  carrier,
  service,
  pickupDate,
  showWarnings,
  onIncludeCodChange,
  onCodTypeChange,
  onCarrierChange,
  onServiceChange,
  onPickupDateChange,
  onShowWarningsChange,
}: CSVOptionsProps) {
  const pickupPreview = pickupDate ? formatPickupPreview(pickupDate) : "";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Opzioni CSV</h3>
        <p className="mt-1 text-xs text-gray-500">
          Configura solo cio che serve prima del download.
        </p>
      </div>

      <div className="space-y-4 p-4">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
              Spedizione
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <FieldHelpLabel
                  htmlFor="csv-carrier"
                  label="Corriere (Mittente)"
                  tooltip={CSV_HELP.carrier}
                />
                <input
                  id="csv-carrier"
                  type="text"
                  value={carrier}
                  onChange={(e) => onCarrierChange(e.target.value)}
                  placeholder="Es. UPS"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <FieldHelpLabel
                  htmlFor="csv-service"
                  label="Servizio"
                  tooltip={CSV_HELP.service}
                />
                <input
                  id="csv-service"
                  type="text"
                  value={service}
                  onChange={(e) => onServiceChange(e.target.value)}
                  placeholder="Es. Standard"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <FieldHelpLabel
                  htmlFor="csv-pickup-date"
                  label="Data Ritiro"
                  tooltip={CSV_HELP.pickupDate}
                />
                <input
                  id="csv-pickup-date"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => onPickupDateChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {pickupDate ? (
                  <p className="mt-2 text-xs text-gray-600">
                    Anteprima export: <span className="font-medium text-gray-800">{pickupPreview}</span>
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    Nessuna data scelta: pickup_date restera vuoto nel CSV e potrai impostarlo in Truckpooling prima della conferma.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Contrassegno
                  </p>
                  <HelpTooltip
                    tooltipId="csv-cod-toggle-tooltip"
                    label="Contrassegno"
                    tooltip={CSV_HELP.codToggle}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  Di default e disattivato: la merce e normalmente gia pagata.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeCod}
                  onChange={(e) => onIncludeCodChange(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600">
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                </span>
                <span className="text-xs font-medium text-gray-700">
                  {includeCod ? "Attivo" : "Spento"}
                </span>
              </label>
            </div>

            {includeCod ? (
              <div className="mt-3">
                <FieldHelpLabel
                  htmlFor="csv-cod-type"
                  label="Tipo Contrassegno"
                  tooltip={CSV_HELP.codType}
                />
                <select
                  id="csv-cod-type"
                  value={codType}
                  onChange={(e) => onCodTypeChange(e.target.value as CodType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A">A (Assicurato)</option>
                  <option value="E">E (Contrassegno)</option>
                  <option value="D">D (Digitale)</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  I campi COD verranno compilati solo per ordini con pagamento COD.
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Con toggle spento, cod_type, cod_value e cod_* restano vuoti nel CSV.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showWarnings}
                  onChange={(e) => onShowWarningsChange(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Avvisi campi mancanti
              </label>
              <HelpTooltip
                tooltipId="csv-show-warnings-tooltip"
                label="Avvisi"
                tooltip={CSV_HELP.showWarnings}
                align="right"
              />
            </div>

            <p className="text-xs text-gray-600">
              Suggerimento multicollo: stesso custom_reference su piu righe, cambia solo weight, height, width e depth.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
