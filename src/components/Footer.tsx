import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/70">
          <p>
            &copy; {new Date().getFullYear()} DigiKI – Stadt Osnabrück
          </p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Rechtliches">
            <Link href="/impressum" className="hover:text-white transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-white transition-colors">
              Datenschutz
            </Link>
            <Link href="/barrierefreiheit" className="hover:text-white transition-colors">
              Barrierefreiheit
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
