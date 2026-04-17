import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-white/70">
          <p>
            &copy; {new Date().getFullYear()} DigiKI – Stadt Osnabrück
            <span className="mx-2">·</span>
            <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <span className="mx-2">·</span>
            <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <span className="mx-2">·</span>
            <Link href="/barrierefreiheit" className="hover:text-white transition-colors">Barrierefreiheit</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
