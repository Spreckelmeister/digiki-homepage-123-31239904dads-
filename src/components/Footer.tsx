import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Projekt-Info */}
          <div>
            <h3 className="text-lg font-bold mb-4">DigiKI</h3>
            <p className="text-sm text-teal/60 leading-relaxed">
              Digitalisierung & Künstliche Intelligenz an Grundschulen
              Osnabrück. Ein Projekt der Stadt Osnabrück, gefördert durch
              regionale Stiftungen und private Förderer.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-teal/60 hover:text-white transition-colors"
                >
                  Startseite
                </Link>
              </li>
              <li>
                <Link
                  href="/ueber-das-projekt"
                  className="text-teal/60 hover:text-white transition-colors"
                >
                  Über das Projekt
                </Link>
              </li>
              <li>
                <Link
                  href="/fuer-schulen"
                  className="text-teal/60 hover:text-white transition-colors"
                >
                  Für Schulen
                </Link>
              </li>
              <li>
                <Link
                  href="/best-practice"
                  className="text-teal/60 hover:text-white transition-colors"
                >
                  Best Practice
                </Link>
              </li>
              <li>
                <Link
                  href="/impressum"
                  className="text-teal/60 hover:text-white transition-colors"
                >
                  Impressum
                </Link>
              </li>
              <li>
                <Link
                  href="/datenschutz"
                  className="text-teal/60 hover:text-white transition-colors"
                >
                  Datenschutz
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="text-lg font-bold mb-4">Kontakt</h3>
            <address className="text-sm text-teal/60 not-italic leading-relaxed">
              <p className="font-medium text-white">Kai Krafft</p>
              <p>Bildungskoordinator</p>
              <p>Stadt Osnabrück</p>
              <p>Bierstraße 20, 49074 Osnabrück</p>
              <p className="mt-2">
                <a
                  href="mailto:krafft@osnabrueck.de"
                  className="hover:text-white transition-colors"
                >
                  krafft@osnabrueck.de
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-teal/50">
          <p>
            &copy; {new Date().getFullYear()} DigiKI – Stadt Osnabrück. Alle
            Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
