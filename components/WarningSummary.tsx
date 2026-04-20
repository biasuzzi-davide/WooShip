"use client";

import { useEffect, useId, useRef } from "react";
import type { WarningSummary } from "@/types";

interface WarningSummaryProps {
  warnings: WarningSummary[];
  onProceed: () => void;
  onCancel: () => void;
}

export default function WarningSummary({
  warnings,
  onProceed,
  onCancel,
}: WarningSummaryProps) {
  const dialogId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = dialogRef.current;
    if (!root) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const getFocusable = () =>
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

    const initial = getFocusable()[0] ?? root;
    initial.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 id={dialogId} className="text-lg font-semibold text-gray-900">
              Dati Indirizzo Mancanti
            </h2>
          </div>
          <p id={descriptionId} className="text-sm text-gray-500 mb-4">
            Ci sono {warnings.length} ordin{warnings.length !== 1 ? "i" : "e"} con campi di spedizione obbligatori mancanti.
            Il CSV conterrà valori vuoti per questi campi.
          </p>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-700">Ordine</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-700">Campi Mancanti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warnings.map((w) => (
                  <tr key={w.orderId}>
                    <td className="px-3 py-2 font-mono text-gray-900">#{w.orderNumber}</td>
                    <td className="px-3 py-2 text-red-600">{w.missingFields.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Procedi al Download
          </button>
        </div>
      </div>
    </div>
  );
}
