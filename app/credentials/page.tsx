"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const formatStoreUrl = (url: string) => {
  let formatted = url.trim();
  if (!formatted) return "";
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }
  return formatted.replace(/\/$/, "");
};

export default function CredentialsPage() {
  const router = useRouter();
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [credentialsSource, setCredentialsSource] = useState<
    "environment" | "cookie" | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [storedStoreUrl, setStoredStoreUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEnvironmentManaged = credentialsSource === "environment";

  useEffect(() => {
    // Load current credential status
    fetch("/api/credentials")
      .then((r) => r.json())
      .then((credsData) => {
        const source =
          credsData.credentialsSource === "environment" ||
          credsData.credentialsSource === "cookie"
            ? credsData.credentialsSource
            : null;
        setCredentialsSource(source);

        if (credsData.hasCredentials) {
          setIsConnected(true);
          setStoredStoreUrl(credsData.storeUrl ?? null);
        }
      })
      .catch(() => {
        // Ignore
      });
  }, []);

  const canSubmit =
    !isEnvironmentManaged &&
    storeUrl.trim() &&
    consumerKey.trim() &&
    consumerSecret.trim();

  const hasAnyManualInput = Boolean(
    storeUrl.trim() || consumerKey.trim() || consumerSecret.trim()
  );

  const canTestCurrentForm = Boolean(
    !isEnvironmentManaged &&
      storeUrl.trim() &&
      consumerKey.trim() &&
      consumerSecret.trim()
  );

  const canTestStoredConnection = Boolean(isConnected && !hasAnyManualInput);
  const canRunConnectionTest = canTestCurrentForm || canTestStoredConnection;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (isEnvironmentManaged) {
      setError("Credenziali gestite da variabili ambiente: modifica da .env o dashboard di deploy.");
      return;
    }
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formattedUrl = formatStoreUrl(storeUrl);
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl: formattedUrl, consumerKey, consumerSecret }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Impossibile salvare le credenziali");
        return;
      }

      setIsConnected(true);
      setCredentialsSource("cookie");
      setStoredStoreUrl(formattedUrl);
      setSuccess("Credenziali salvate con successo!");
      setStoreUrl("");
      setConsumerKey("");
      setConsumerSecret("");

      // Redirect after delay
      setTimeout(() => {
        router.replace("/orders");
      }, 1500);
    } catch {
      setError("Errore di rete. Riprova per favore.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!canRunConnectionTest) return;
    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const useFormValues = canTestCurrentForm;
      const payload = useFormValues
        ? {
            storeUrl: formatStoreUrl(storeUrl),
            consumerKey: consumerKey.trim(),
            consumerSecret: consumerSecret.trim(),
          }
        : {};

      const res = await fetch("/api/credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        const sourceLabel =
          data.source === "manual"
            ? "valori inseriti"
            : data.source === "environment"
              ? "variabili ambiente"
              : "credenziali salvate";

        setSuccess(
          `Connessione riuscita (${sourceLabel}). Store: ${data.store ?? data.storeUrl} · WooCommerce ${data.version}.`
        );
      } else {
        setError(data.error ?? "Connessione fallita");
      }
    } catch {
      setError("Errore di rete durante il test di connessione.");
    } finally {
      setIsTesting(false);
    }
  }

  async function handleClearCredentials() {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/credentials", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Impossibile rimuovere le credenziali");
        return;
      }

      setIsConnected(false);
      setStoredStoreUrl(null);
      setSuccess("Credenziali rimosse.");
    } catch {
      setError("Errore di rete. Riprova per favore.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">WooShip</h1>
          <p className="text-gray-500 mt-1">
            WooCommerce → Spedizioni CSV
          </p>
        </div>

        {/* Connected State */}
        {isConnected && !showDeleteConfirm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  isEnvironmentManaged ? "bg-amber-500" : "bg-green-500"
                }`}
              ></div>
              <span className="font-medium text-gray-900">
                {isEnvironmentManaged ? "Connesso (Environment)" : "Connesso"}
              </span>
            </div>
            {storedStoreUrl && (
              <p className="text-sm text-gray-500 mb-4">
                Negozio: <code className="bg-gray-100 px-1 rounded">{storedStoreUrl}</code>
              </p>
            )}
            {isEnvironmentManaged && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                Le credenziali attive provengono da variabili ambiente. Da questa pagina puoi solo verificarne la connessione.
              </p>
            )}
            <div className="flex gap-3">
              <a
                href="/orders"
                className="flex-1 text-center bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Vai agli Ordini
              </a>
              {!isEnvironmentManaged && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Rimuovi
                </button>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && !isEnvironmentManaged && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Rimuovere le credenziali?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Questo rimuoverà le tue credenziali WooCommerce salvate in questo browser.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearCredentials}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Rimozione in corso..." : "Sì, rimuovi"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isEnvironmentManaged
              ? "Credenziali gestite da variabili ambiente"
              : isConnected
                ? "Aggiorna Credenziali"
                : "Inserisci Credenziali WooCommerce"}
          </h2>

          {isEnvironmentManaged && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Le modifiche sono disabilitate in questa modalità. Aggiorna le variabili di ambiente per cambiare store o chiavi API.
              </p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Negozio
              </label>
              <input
                type="text"
                inputMode="url"
                value={isEnvironmentManaged ? (storedStoreUrl ?? "") : storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                onBlur={(e) => setStoreUrl(formatStoreUrl(e.target.value))}
                placeholder="https://yourstore.com"
                disabled={isEnvironmentManaged}
                readOnly={isEnvironmentManaged}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEnvironmentManaged ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chiave Cliente (Consumer Key)
              </label>
              <input
                type="text"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder={isEnvironmentManaged ? "Gestito da variabili ambiente" : "ck_..."}
                disabled={isEnvironmentManaged}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                  isEnvironmentManaged ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segreto Cliente (Consumer Secret)
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder={isEnvironmentManaged ? "Gestito da variabili ambiente" : "cs_..."}
                  disabled={isEnvironmentManaged}
                  className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                    isEnvironmentManaged ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                  }`}
                />
                {!isEnvironmentManaged && (
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!isEnvironmentManaged && (
                <button
                  type="submit"
                  disabled={!canSubmit || isSaving}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Salvataggio..." : "Salva Credenziali"}
                </button>
              )}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={!canRunConnectionTest || isTesting}
                className={`${isEnvironmentManaged ? "flex-1" : ""} px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isTesting
                  ? "Test in corso..."
                  : canTestCurrentForm
                    ? "Testa Valori Inseriti"
                    : "Testa Connessione"}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              {isEnvironmentManaged
                ? "Il test usa le credenziali caricate da variabili ambiente."
                : canTestCurrentForm
                  ? "Il test usa i valori inseriti senza salvarli."
                  : canTestStoredConnection
                    ? "Il test usa le credenziali attualmente salvate."
                    : "Inserisci URL, consumer key e consumer secret per testare senza salvare."}
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {isEnvironmentManaged
            ? "Le credenziali attive sono gestite da variabili ambiente."
            : "Le credenziali sono crittografate e archiviate in modo sicuro in questo browser."}
        </p>
      </div>
    </div>
  );
}
