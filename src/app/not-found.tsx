import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-24 text-center">
      <div className="mx-auto max-w-xl px-4">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-lg text-text-light mb-8">
          Die angeforderte Seite wurde nicht gefunden.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Zur Startseite
        </Link>
      </div>
    </section>
  );
}
