/**
 * Editoriale Sektions-Karte für mehrstufige Formulare.
 *
 * Layout-Idee: links eine große, dezent gefärbte Section-Nummer als
 * visueller Anker; rechts Eyebrow-Caps + Title + Body und darunter
 * der Inhalt, ausgerichtet an der Title-Spalte. Mobil stapelt alles
 * vertikal.
 */
interface FormSectionProps {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export default function FormSection({
  index,
  eyebrow,
  title,
  body,
  icon,
  children,
}: FormSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm md:p-10">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-[110px_1fr] md:gap-10">
        <div className="flex items-baseline gap-4 md:flex-col md:items-start md:gap-3">
          <span
            aria-hidden="true"
            className="select-none font-mono text-6xl font-bold leading-none tracking-tighter text-primary/15 tabular-nums md:text-7xl"
          >
            {index}
          </span>
          <span className="hidden h-0.5 w-10 bg-accent-strong md:block" />
        </div>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-accent-strong">
            <span aria-hidden="true">{icon}</span>
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-primary md:text-[28px]">
            {title}
          </h2>
          <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-text-light">
            {body}
          </p>
        </div>
      </header>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[110px_1fr] md:gap-10">
        {/* Linke Spalte als Spacer – richtet Inhalt unter der Title-Spalte aus */}
        <span aria-hidden="true" className="hidden md:block" />
        <div className="space-y-6">{children}</div>
      </div>
    </section>
  );
}
