"use client";

import { useState, useEffect } from "react";

export default function CredentialsPage() {
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [storedStoreUrl, setStoredStoreUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [isSessionCookieMode, setIsSessionCookieMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Load current credential status
    Promise.all([
      fetch("/api/credentials").then((r) => r.json()),
      fetch("/api/storage-mode").then((r) => r.json()),
    ]).then(([credsData, storageData]) => {
      if (credsData.hasCredentials) {
        setIsConnected(true);
        setStoredStoreUrl(credsData.storeUrl ?? null);
      }
      if (storageData.storageMode === "session_cookie") {
        setIsSessionCookieMode(true);
      }
    }).catch(() => {
      // Ignore
    });
  }, []);

  const isStorageUnavailable = isSessionCookieMode && !isConnected;
  const canSubmit =
    !isStorageUnavailable &&
    storeUrl.trim() &&
    consumerKey.trim() &&
    consumerSecret.trim();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save credentials");
        return;
      }

      setIsConnected(true);
      setStoredStoreUrl(storeUrl);
      setSuccess("Credentials saved successfully!");
      setStoreUrl("");
      setConsumerKey("");
      setConsumerSecret("");

      // Redirect after delay
      setTimeout(() => {
        window.location.href = "/orders";
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      // Try to fetch orders as a connection test
      const res = await fetch("/api/orders");
      const data = await res.json();

      if (res.ok) {
        setSuccess(
          `Connected! Found ${data.total} orders. (Store: ${storedStoreUrl ?? storeUrl})`
        );
      } else {
        setError(data.error ?? "Connection failed");
      }
    } catch {
      setError("Network error during connection test.");
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
        setError(data.error ?? "Failed to clear credentials");
        return;
      }

      setIsConnected(false);
      setStoredStoreUrl(null);
      setSuccess("Credentials cleared.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Spedizione</h1>
          <p className="text-gray-500 mt-1">
            WooCommerce → Shipping CSV
          </p>
        </div>

        {/* Non-persistent environment warning */}
        {isSessionCookieMode && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 shrink-0"
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
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Filesystem storage unavailable
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  This environment does not support persistent filesystem writes.
                  The fallback session_cookie storage is not implemented yet.
                  Configure WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY and
                  WOOCOMMERCE_CONSUMER_SECRET as environment variables.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Connected State */}
        {isConnected && !showDeleteConfirm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-gray-900">Connected</span>
            </div>
            {storedStoreUrl && (
              <p className="text-sm text-gray-500 mb-4">
                Store: <code className="bg-gray-100 px-1 rounded">{storedStoreUrl}</code>
              </p>
            )}
            <div className="flex gap-3">
              <a
                href="/orders"
                className="flex-1 text-center bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Orders
              </a>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Clear credentials?</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will remove your stored WooCommerce credentials.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearCredentials}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Clearing..." : "Yes, clear"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isConnected ? "Update Credentials" : "Enter WooCommerce Credentials"}
          </h2>

          {isStorageUnavailable && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                UI credential saving is disabled in this environment. Use WOOCOMMERCE_* environment variables.
              </p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store URL
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://yourstore.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumer Key
              </label>
              <input
                type="text"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder="ck_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumer Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
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
              <button
                type="submit"
                disabled={!canSubmit || isSaving}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Credentials"}
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isStorageUnavailable || (!storedStoreUrl && !storeUrl) || isTesting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? "Testing..." : "Test"}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Credentials are encrypted and stored server-side. Never sent to the client.
        </p>
      </div>
    </div>
  );
}
