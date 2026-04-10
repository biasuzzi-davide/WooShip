import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">WooShip</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/credentials"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Credenziali
            </Link>
            <Link
              href="/orders"
              className="text-sm font-medium text-gray-900"
            >
              Ordini
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
