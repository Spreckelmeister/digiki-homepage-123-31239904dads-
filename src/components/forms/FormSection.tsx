/**
 * Editoriale Sektions-Karte für mehrstufige Formulare.
 * Große hellgraue Section-Nummer links + Eyebrow-Caps mit Icon, Title
 * und beschreibender Body-Text rechts. Inhalt wird darunter (rechts-
 * bündig zur Spalte) gerendert.
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
    <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
      <header className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr] md:gap-8">
        <div className="flex items-baseline gap-3 md:flex-col md:items-start md:gap-2">
          <span
            aria-hidden="true"
            className="select-none font-mono text-5xl font-bold leading-none tracking-tighter text-primary/15 tabular-nums md:text-6xl"
          >
            {index}
          </span>
          <span className="hidden h-0.5 w-8 bg-accent-strong md:block" />
        </div>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-accent-strong">
            <span aria-hidden="true">{icon}</span>
            {eyebrow}
          </p>
          <h2 className="mt-1.5 text-xl font-bold leading-tight tracking-tight text-primary md:text-2xl">
            {title}
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-light">
            {body}
          </p>
        </div>
      </header>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[auto_1fr] md:gap-8">
        <span aria-hidden="true" className="hidden md:block md:w-[60px]" />
        <div className="space-y-5">{children}</div>
      </div>
    </section>
  );
}
