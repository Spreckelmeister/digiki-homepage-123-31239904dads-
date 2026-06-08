"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { wrapMailing } from "@/lib/email/wrapMailing";

type Recipient = {
  id: string;
  email: string;
  full_name: string | null;
  school: string | null;
  confirmed: boolean;
};

type SendResult = {
  ok: boolean;
  mode: "test" | "bulk";
  total: number;
  sent: number;
  failed: { email: string; error: string }[];
};

const SAMPLE_BODY = `<p>Liebe Schulen,</p>

<p>kurze Info: am <strong>15. Oktober</strong> findet unser nächstes
DigiKI-Treffen statt – diesmal mit Fokus auf den Einsatz von KI in der
Sprachförderung.</p>

<p style="margin:24px 0;">
  <a href="https://www.digiki-os.de"
     style="display:inline-block;background-color:#006363;color:#ffffff;
            text-decoration:none;font-weight:bold;font-size:15px;
            padding:12px 22px;border-radius:8px;">
    Jetzt anmelden
  </a>
</p>

<p>Viele Grüße,<br /><strong>Ihr DigiKI-Team</strong></p>`;

export default function BulkMailingTool({ adminEmail }: { adminEmail: string }) {
  // ── Empfänger ────────────────────────────────────────────────────────────
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [audience, setAudience] = useState<"all" | "confirmed">("confirmed");

  async function loadRecipients() {
    setRecipientsLoading(true);
    setRecipientsError(null);
    try {
      const res = await fetch("/api/admin/mailings/recipients", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Laden");
      setRecipients(data.recipients ?? []);
    } catch (err) {
      setRecipientsError(
        err instanceof Error ? err.message : "Unbekannter Fehler",
      );
    } finally {
      setRecipientsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecipients();
  }, []);

  const filtered = useMemo(
    () =>
      audience === "confirmed"
        ? recipients.filter((r) => r.confirmed)
        : recipients,
    [recipients, audience],
  );
  const confirmedCount = recipients.filter((r) => r.confirmed).length;
  const unconfirmedCount = recipients.length - confirmedCount;

  // ── Editor-State ─────────────────────────────────────────────────────────
  const [subject, setSubject] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [heading, setHeading] = useState("");
  const [preheader, setPreheader] = useState("");
  const [html, setHtml] = useState("");
  const [useWrapper, setUseWrapper] = useState(true);
  const [testEmail, setTestEmail] = useState(adminEmail);

  // ── Versand-State ────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Preview ───────────────────────────────────────────────────────────────
  const previewHtml = useMemo(() => {
    if (!html.trim()) {
      return wrapMailing({
        bodyHtml:
          '<p style="color:#999;font-style:italic;">Ihr HTML-Inhalt erscheint hier – fügen Sie links etwas ein.</p>',
        eyebrow: eyebrow || "Vorschau",
        heading: heading || "Vorschau",
      });
    }
    return useWrapper
      ? wrapMailing({ bodyHtml: html, eyebrow, heading, preheader })
      : html;
  }, [html, useWrapper, eyebrow, heading, preheader]);

  async function sendTest() {
    if (!testEmail || !testEmail.includes("@")) {
      setSendError("Bitte eine gültige Test-E-Mail-Adresse angeben.");
      return;
    }
    if (!subject.trim() || !html.trim()) {
      setSendError("Betreff und Inhalt dürfen nicht leer sein.");
      return;
    }
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/mailings/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "test",
          testEmail,
          subject,
          html,
          useWrapper,
          eyebrow,
          heading,
          preheader,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Versand fehlgeschlagen");
      setSendResult(data);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Unbekannter Fehler",
      );
    } finally {
      setSending(false);
    }
  }

  async function sendBulk() {
    setShowConfirm(false);
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/mailings/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bulk",
          audience,
          subject,
          html,
          useWrapper,
          eyebrow,
          heading,
          preheader,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Versand fehlgeschlagen");
      setSendResult(data);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Unbekannter Fehler",
      );
    } finally {
      setSending(false);
    }
  }

  const canSend = subject.trim().length > 0 && html.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* ═════════════════ Empfänger-Card ═════════════════ */}
      <section className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div className="flex items-start gap-5">
            <span
              aria-hidden="true"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Empfänger
              </p>
              <p className="mt-1 text-3xl font-bold leading-none tracking-tight text-text">
                {recipientsLoading ? (
                  <span className="inline-flex items-center gap-2 text-xl text-text-light">
                    <Loader2 className="h-5 w-5 animate-spin" /> Laden…
                  </span>
                ) : (
                  <>
                    {filtered.length}
                    <span className="ml-2 text-base font-normal text-text-light">
                      von {recipients.length}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-2 text-sm text-text-light">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {confirmedCount} bestätigt
                </span>
                <span className="mx-2 text-border">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  {unconfirmedCount} unbestätigt
                </span>
              </p>
              {recipientsError && (
                <p className="mt-2 text-sm text-red-700">{recipientsError}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div
              role="radiogroup"
              aria-label="Empfänger filtern"
              className="inline-flex rounded-lg border border-border bg-bg p-1"
            >
              {([
                { val: "confirmed", label: "Nur bestätigte" },
                { val: "all", label: "Alle" },
              ] as const).map((opt) => {
                const active = audience === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAudience(opt.val)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white text-primary shadow-sm"
                        : "text-text-light hover:text-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={loadRecipients}
              disabled={recipientsLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-light hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  recipientsLoading ? "animate-spin" : ""
                }`}
              />
              Liste aktualisieren
            </button>
          </div>
        </div>

        {/* Empfänger-Schnellblick (zusammenklappbar) */}
        {!recipientsLoading && filtered.length > 0 && (
          <details className="border-t border-border">
            <summary className="cursor-pointer px-6 py-3 text-sm font-medium text-text-light hover:text-primary transition-colors md:px-8">
              Empfänger anzeigen ({filtered.length})
            </summary>
            <ul className="max-h-64 overflow-y-auto px-6 pb-4 md:px-8">
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] text-text">
                      {r.email}
                    </p>
                    {(r.full_name || r.school) && (
                      <p className="truncate text-xs text-text-light">
                        {[r.full_name, r.school].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  {r.confirmed ? (
                    <span className="ml-3 inline-flex items-center gap-1 text-xs text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> bestätigt
                    </span>
                  ) : (
                    <span className="ml-3 inline-flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> offen
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ═════════════════ Editor + Preview ═════════════════ */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── EDITOR ── */}
        <section className="space-y-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
          <header>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong">
              <Code2 className="mr-1.5 inline h-3 w-3" /> Editor
            </p>
            <h2 className="mt-1 text-xl font-bold text-primary">
              Inhalt der Mail
            </h2>
          </header>

          {/* Settings */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="m-subject"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Betreff *
              </label>
              <input
                id="m-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="z. B. Einladung zum DigiKI-Treffen am 15.10."
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg/40 px-4 py-3 transition-colors hover:bg-bg">
              <input
                type="checkbox"
                checked={useWrapper}
                onChange={(e) => setUseWrapper(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-accent-strong"
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-text">
                  Standard-DigiKI-Layout verwenden
                </span>
                <span className="block text-xs text-text-light leading-relaxed mt-0.5">
                  Fügt Logo-Header, Türkis-Gradient und Footer um Ihr HTML herum.
                  Deaktivieren Sie das nur, wenn Sie ein komplett eigenes Layout
                  schicken möchten.
                </span>
              </span>
            </label>

            {useWrapper && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="m-eyebrow"
                    className="mb-1.5 block text-sm font-medium text-text"
                  >
                    Eyebrow (klein, gesperrt)
                  </label>
                  <input
                    id="m-eyebrow"
                    type="text"
                    value={eyebrow}
                    onChange={(e) => setEyebrow(e.target.value)}
                    maxLength={60}
                    placeholder="z. B. Einladung"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="m-heading"
                    className="mb-1.5 block text-sm font-medium text-text"
                  >
                    Überschrift (H1)
                  </label>
                  <input
                    id="m-heading"
                    type="text"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    maxLength={120}
                    placeholder="z. B. Wir sehen uns am 15. Oktober"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="m-preheader"
                    className="mb-1.5 block text-sm font-medium text-text"
                  >
                    Preheader (Vorschau in Inbox-Liste)
                  </label>
                  <input
                    id="m-preheader"
                    type="text"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    maxLength={140}
                    placeholder="Kurzbeschreibung, die in der Mail-Vorschau erscheint"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* HTML-Editor */}
          <div>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <label
                htmlFor="m-html"
                className="block text-sm font-medium text-text"
              >
                HTML-Inhalt *
              </label>
              <button
                type="button"
                onClick={() => setHtml(SAMPLE_BODY)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <Sparkles className="h-3 w-3" /> Beispiel einfügen
              </button>
            </div>
            <textarea
              id="m-html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={14}
              spellCheck={false}
              placeholder={"<p>Hallo,</p>\n<p>Ihr Text hier …</p>"}
              className="editor-dark w-full rounded-lg border border-border px-4 py-3 font-mono text-[13px] leading-relaxed focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors"
              style={{ minHeight: 320 }}
            />
            <p className="mt-1.5 text-xs text-text-light">
              Inline-Styles verwenden (kein {`<style>`}-Block). Maximal 600px breit
              für gute Lesbarkeit in Outlook & Gmail.
            </p>
          </div>

          {/* Test-Senden */}
          <div className="rounded-xl border border-border bg-bg/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
              <Eye className="mr-1 inline h-3 w-3" /> Test
            </p>
            <p className="mt-1.5 text-sm text-text-light">
              Erst eine Test-Mail an sich selbst senden, um Darstellung in
              Outlook/Gmail/Mobil zu prüfen.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.de"
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none transition-colors bg-white"
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={sending || !canSend || !testEmail.includes("@")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Test versenden
              </button>
            </div>
          </div>

          {/* Bulk-Senden */}
          <div className="border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={sending || !canSend || filtered.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-5 py-3 text-base font-bold text-white transition-colors hover:bg-accent-strong/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              An {filtered.length} Empfänger versenden
            </button>
            <p className="mt-2 text-center text-xs text-text-light">
              Versand erfolgt einzeln (kein BCC), DSGVO-konform.
            </p>
          </div>

          {/* Feedback */}
          {sendError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{sendError}</p>
            </div>
          )}
          {sendResult && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">
                    {sendResult.mode === "test"
                      ? "Test-Mail versendet."
                      : `${sendResult.sent} von ${sendResult.total} Mails gesendet.`}
                  </p>
                  {sendResult.failed.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-amber-800">
                        {sendResult.failed.length} fehlgeschlagen
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-amber-900">
                        {sendResult.failed.map((f) => (
                          <li key={f.email}>
                            <code className="font-mono">{f.email}</code> –{" "}
                            {f.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── PREVIEW ── */}
        <section className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong">
                <Eye className="mr-1.5 inline h-3 w-3" /> Vorschau
              </p>
              <h2 className="mt-1 text-xl font-bold text-primary">
                So wird die Mail aussehen
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[11px] font-medium text-text-light">
              <Mail className="h-3 w-3" />
              {useWrapper ? "Mit Layout" : "Roh-HTML"}
            </span>
          </header>
          <div className="overflow-hidden rounded-2xl border border-border bg-[#F5F9F9] shadow-sm">
            <div className="border-b border-border bg-white px-4 py-2.5">
              <p className="truncate text-xs text-text-light">
                <span className="font-semibold text-text">Betreff:</span>{" "}
                {subject || (
                  <span className="italic text-text-light/70">
                    (noch nicht eingegeben)
                  </span>
                )}
              </p>
            </div>
            <iframe
              title="E-Mail-Vorschau"
              sandbox=""
              srcDoc={previewHtml}
              className="block h-[600px] w-full border-0 bg-[#F5F9F9]"
            />
          </div>
          <p className="text-xs text-text-light">
            Skripte und Formulare sind in dieser Vorschau deaktiviert.
          </p>
        </section>
      </div>

      {/* ═════════════════ Bestätigungs-Modal ═════════════════ */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-strong">
                  Versand bestätigen
                </p>
                <h3
                  id="confirm-title"
                  className="mt-1 text-lg font-bold text-primary"
                >
                  An {filtered.length} Empfänger senden?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                aria-label="Schließen"
                className="text-text-light hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="rounded-lg border border-border bg-bg/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
                  Betreff
                </p>
                <p className="mt-1 font-medium text-text">{subject}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-bg/40 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
                    Zielgruppe
                  </p>
                  <p className="mt-1 font-medium text-text">
                    {audience === "confirmed"
                      ? "Nur bestätigte Accounts"
                      : "Alle Accounts"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg/40 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
                    Layout
                  </p>
                  <p className="mt-1 font-medium text-text">
                    {useWrapper ? "DigiKI-Standard" : "Roh-HTML"}
                  </p>
                </div>
              </div>
              {filtered.length > 0 && (
                <details className="rounded-lg border border-border bg-bg/40 p-3">
                  <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
                    Erste Empfänger anzeigen
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-text-light">
                    {filtered.slice(0, 10).map((r) => (
                      <li key={r.id}>{r.email}</li>
                    ))}
                    {filtered.length > 10 && (
                      <li className="italic">
                        … und {filtered.length - 10} weitere
                      </li>
                    )}
                  </ul>
                </details>
              )}
              <p className="text-xs text-text-light">
                Versand kann nicht rückgängig gemacht werden.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-text-light transition-colors hover:bg-bg"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={sendBulk}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-strong px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-strong/90"
              >
                <Send className="h-4 w-4" />
                Jetzt versenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
