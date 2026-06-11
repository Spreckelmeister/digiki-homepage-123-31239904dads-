"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Copy,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
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

type SourceKey = "accounts" | "participants" | "contacts" | "manual";
type Sources = {
  accounts: Recipient[];
  participants: Recipient[];
  contacts: Recipient[];
  manual: Recipient[];
};

const SOURCE_LABEL: Record<SourceKey, string> = {
  accounts: "DigiKI-Konten",
  participants: "Schulungsteilnehmer",
  contacts: "Ansprechpartner",
  manual: "Manuell",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type SendResult = {
  ok: boolean;
  mode: "test" | "bulk" | "selected" | "list";
  total: number;
  sent: number;
  failed: { email: string; error: string }[];
};

// Fertiger Prompt, den der Admin in einen beliebigen KI-Chat
// (ChatGPT, Claude, Gemini …) kopieren kann, um eine bestehende Mail
// in das DigiKI-Format zu überführen. Output passt direkt in das
// HTML-Editor-Feld unten (ohne Wrapper – das Tool fügt Header + Footer
// automatisch hinzu).
const AI_CONVERT_PROMPT = `Du bist ein E-Mail-HTML-Designer. Wandle den unten stehenden Mailtext in HTML um, das ich direkt in das DigiKI-Mailing-Tool einfügen kann.

ANFORDERUNGEN:
- Nur den Body-HTML zurückgeben (KEIN <html>, <head>, <body>, <style> – Header/Footer ergänzt das Tool automatisch).
- Ausschließlich Inline-Styles verwenden (Outlook/Gmail-kompatibel).
- Maximale Breite des Inhalts: ca. 560 px (also keine eigenen <table width="600">-Wrapper – nur Absätze, Listen, Buttons, einfache Tabellen).
- Schriftart: Arial, Helvetica, sans-serif. Schriftgröße Fließtext: 15 px, Zeilenhöhe 1.6, Textfarbe #1A1A1A.
- Absätze über <p style="margin:0 0 16px 0;...">, keine <br>-Ketten.
- Überschriften (falls nötig): <h2 style="margin:24px 0 12px 0;font-size:18px;color:#006363;font-weight:bold;">.
- Hervorhebungen: <strong>, nicht <b>. Links: <a style="color:#006363;text-decoration:underline;">.
- Buttons im Markenstil:
    <p style="margin:24px 0;"><a href="ZIEL_URL" style="display:inline-block;background-color:#006363;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:8px;">Button-Text</a></p>
- Info-/Hinweis-Boxen (optional): hellblaue Callout-Box
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#EBF8F7;border:1px solid #B6E1DD;border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 16px;font-size:14px;color:#1A1A1A;">…</td></tr></table>
- Keine Bilder einbetten, keine externen Schriften, keine JavaScript-Bestandteile.
- Sie-Form, freundlich, professionell, deutsche Sprache.

EINZUSETZENDER ORIGINAL-TEXT:
"""
[HIER DEN BISHERIGEN MAILTEXT EINFÜGEN]
"""

Antworte ausschließlich mit dem fertigen HTML-Snippet – keine Erklärungen davor oder danach, kein Code-Fence.`;

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
  // ── Empfänger (mehrere Quellen + dauerhaft gespeicherte manuelle) ────────
  const [sources, setSources] = useState<Sources>({
    accounts: [],
    participants: [],
    contacts: [],
    manual: [],
  });
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  // Ausgewählte E-Mails (lowercase als Schlüssel) – über ALLE Quellen.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualInput, setManualInput] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [tab, setTab] = useState<SourceKey>("accounts");
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "confirmed">("confirmed");

  async function loadRecipients() {
    setRecipientsLoading(true);
    setRecipientsError(null);
    try {
      const res = await fetch("/api/admin/mailings/recipients", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Laden");
      const manualList: Recipient[] = data.manual ?? [];
      setSources({
        accounts: data.accounts ?? [],
        participants: data.participants ?? [],
        contacts: data.contacts ?? [],
        manual: manualList,
      });
      // Gespeicherte manuelle Adressen sind dauerhaft im Verteiler →
      // standardmäßig vorausgewählt.
      setSelected((prev) => {
        const next = new Set(prev);
        manualList.forEach((m) => next.add(m.email.toLowerCase()));
        return next;
      });
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

  const sourceList = (key: SourceKey): Recipient[] => sources[key];

  // Liste im aktuellen Tab (Konto-Filter + Suche angewendet).
  const currentList = useMemo(() => {
    let list = sources[tab];
    if (tab === "accounts" && accountFilter === "confirmed")
      list = list.filter((r) => r.confirmed);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          (r.full_name ?? "").toLowerCase().includes(q) ||
          (r.school ?? "").toLowerCase().includes(q),
      );
    return list;
  }, [tab, sources, accountFilter, query]);

  const countSelectedIn = (key: SourceKey) =>
    sources[key].filter((r) => selected.has(r.email.toLowerCase())).length;

  // Finale Empfängerliste = alle ausgewählten Adressen.
  const finalEmails = useMemo(() => Array.from(selected), [selected]);

  function toggleSelected(email: string) {
    const key = email.toLowerCase();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addAllShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      currentList.forEach((r) => next.add(r.email.toLowerCase()));
      return next;
    });
  }

  function removeAllShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      currentList.forEach((r) => next.delete(r.email.toLowerCase()));
      return next;
    });
  }

  // Wirklich ALLE Empfänger aus allen Quellen auf einen Klick.
  function selectEverything() {
    setSelected(() => {
      const next = new Set<string>();
      [
        ...sources.accounts,
        ...sources.participants,
        ...sources.contacts,
        ...sources.manual,
      ].forEach((r) => next.add(r.email.toLowerCase()));
      return next;
    });
  }

  // Nur die Auswahl leeren – gespeicherte manuelle Adressen bleiben erhalten.
  function clearAll() {
    setSelected(new Set());
  }

  // Manuelle Adressen DAUERHAFT speichern (DB), neue gleich auswählen.
  async function addManual() {
    const emails = manualInput
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((p) => EMAIL_RE.test(p));
    if (emails.length === 0 || manualBusy) return;
    setManualBusy(true);
    setRecipientsError(null);
    try {
      const res = await fetch("/api/admin/mailings/extra-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      const manualList: Recipient[] = data.recipients ?? [];
      setSources((prev) => ({ ...prev, manual: manualList }));
      setSelected((prev) => {
        const next = new Set(prev);
        emails.forEach((e) => next.add(e.toLowerCase()));
        return next;
      });
      setManualInput("");
    } catch (err) {
      setRecipientsError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setManualBusy(false);
    }
  }

  async function removeManual(email: string) {
    setSources((prev) => ({
      ...prev,
      manual: prev.manual.filter((m) => m.email !== email),
    }));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(email.toLowerCase());
      return next;
    });
    try {
      await fetch("/api/admin/mailings/extra-recipients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* lokal schon entfernt; ein Reload synchronisiert wieder */
    }
  }

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

  // ── Prompt-Copy-State ────────────────────────────────────────────────────
  const [promptCopied, setPromptCopied] = useState(false);
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_CONVERT_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      // Fallback: select textarea content
      const ta = document.getElementById("ai-prompt-textarea") as HTMLTextAreaElement | null;
      ta?.select();
    }
  }

  // Test-Mail-Adresse: standardmäßig die des aktuell eingeloggten Admins.
  // Falls `adminEmail` erst nach dem ersten Render verfügbar wird oder der
  // Nutzer das Feld geleert hat, springt es automatisch zurück – manuelles
  // Überschreiben bleibt natürlich möglich.
  useEffect(() => {
    if (adminEmail && !testEmail.trim()) setTestEmail(adminEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail]);

  // ── Preview ───────────────────────────────────────────────────────────────
  // Für die Vorschau verwenden wir das lokal ausgelieferte Logo. Die
  // externe digiki-os.de-URL wird in einem sandboxed iframe auf
  // localhost oft nicht angezeigt (CORS/Referrer), was die Preview-Optik
  // verfälscht. Der Versand selbst nutzt weiterhin die Production-URL.
  const PREVIEW_LOGO = "/images/logos/DigiKI_Logo_v5.png";
  const previewHtml = useMemo(() => {
    if (!html.trim()) {
      return wrapMailing({
        bodyHtml:
          '<p style="color:#999;font-style:italic;">Ihr HTML-Inhalt erscheint hier – fügen Sie links etwas ein.</p>',
        eyebrow: eyebrow || "Vorschau",
        heading: heading || "Vorschau",
        logoUrl: PREVIEW_LOGO,
      });
    }
    return useWrapper
      ? wrapMailing({ bodyHtml: html, eyebrow, heading, preheader, logoUrl: PREVIEW_LOGO })
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
          mode: "list",
          recipients: finalEmails,
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
        {/* Kopf: Gesamtzahl + Aktionen */}
        <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
          <div className="flex items-start gap-5">
            <span aria-hidden="true" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Empfänger</p>
              <p className="mt-1 text-3xl font-bold leading-none tracking-tight text-text">
                {recipientsLoading ? (
                  <span className="inline-flex items-center gap-2 text-xl text-text-light">
                    <Loader2 className="h-5 w-5 animate-spin" /> Laden…
                  </span>
                ) : (
                  <>
                    {finalEmails.length}
                    <span className="ml-2 text-base font-normal text-text-light">ausgewählt</span>
                  </>
                )}
              </p>
              {!recipientsLoading && (
                <p className="mt-2 text-xs text-text-light">
                  {countSelectedIn("accounts")} Konten · {countSelectedIn("participants")} Teilnehmer ·{" "}
                  {countSelectedIn("contacts")} Ansprechpartner · {countSelectedIn("manual")} manuell
                </p>
              )}
              {recipientsError && <p className="mt-2 text-sm text-red-700">{recipientsError}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={selectEverything}
              disabled={recipientsLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Alle auswählen
            </button>
            {finalEmails.length > 0 && (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-text-light hover:text-red-700 hover:underline">
                Auswahl zurücksetzen
              </button>
            )}
            <button type="button" onClick={loadRecipients} disabled={recipientsLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-light hover:text-primary transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${recipientsLoading ? "animate-spin" : ""}`} />
              Liste aktualisieren
            </button>
          </div>
        </div>

        {/* Tabs der Empfängerquellen */}
        <div className="flex flex-wrap gap-1 border-b border-border px-4 pt-3 md:px-6" role="tablist" aria-label="Empfängerquelle">
          {(["accounts", "participants", "contacts", "manual"] as SourceKey[]).map((key) => {
            const active = tab === key;
            const cnt = countSelectedIn(key);
            const avail = sourceList(key).length;
            return (
              <button key={key} type="button" role="tab" aria-selected={active}
                onClick={() => { setTab(key); setQuery(""); }}
                className={`inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "border-b-2 border-primary text-primary" : "text-text-light hover:text-text"
                }`}>
                {SOURCE_LABEL[key]}
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${cnt > 0 ? "bg-primary/10 text-primary" : "bg-bg text-text-light"}`}>
                  {cnt}{avail != null ? `/${avail}` : ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab-Inhalt */}
        <div className="p-4 md:p-6">
          {recipientsLoading ? (
            <p className="py-6 text-sm text-text-light">Lade Empfänger …</p>
          ) : tab === "manual" ? (
            <div>
              <p className="mb-3 text-sm text-text-light">
                Adressen, die nirgendwo automatisch hinterlegt sind – z. B. externe
                Gäste oder Kooperationspartner. Sie werden <strong>dauerhaft
                gespeichert</strong> und bleiben im Verteiler.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addManual(); } }}
                  placeholder="name@schule.de, weitere@beispiel.de"
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-light focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-strong/40" />
                <button type="button" onClick={() => void addManual()} disabled={manualBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {manualBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Speichern
                </button>
              </div>
              <p className="mt-1.5 text-xs text-text-light">
                Mehrere Adressen mit Komma, Semikolon oder Leerzeichen trennen.
              </p>
              {sources.manual.length > 0 ? (
                <ul className="mt-3 max-h-72 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
                  {sources.manual.map((r) => {
                    const checked = selected.has(r.email.toLowerCase());
                    return (
                      <li key={r.id} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${checked ? "bg-primary/5" : ""}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSelected(r.email)}
                          className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-accent-strong" />
                        <span className="min-w-0 flex-1 truncate text-text">{r.email}</span>
                        <button type="button" onClick={() => void removeManual(r.email)} aria-label={`${r.email} löschen`}
                          className="shrink-0 rounded-md p-1 text-text-light transition-colors hover:bg-red-50 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-text-light">Noch keine gespeicherten Adressen.</p>
              )}
            </div>
          ) : (
            <>
              {tab === "accounts" && (
                <div className="mb-3 inline-flex rounded-lg border border-border bg-bg p-1" role="radiogroup" aria-label="Konten filtern">
                  {([["confirmed", "Nur bestätigte"], ["all", "Alle"]] as const).map(([v, l]) => (
                    <button key={v} type="button" role="radio" aria-checked={accountFilter === v} onClick={() => setAccountFilter(v)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${accountFilter === v ? "bg-white text-primary shadow-sm" : "text-text-light hover:text-text"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light" aria-hidden="true" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen (Name, Schule, E-Mail) …" aria-label="Empfänger suchen"
                  className="w-full rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-light focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-strong/40" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-primary">
                  {countSelectedIn(tab)} von {sourceList(tab).length} ausgewählt
                </span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={addAllShown} className="font-semibold text-primary hover:underline">
                    {query.trim() ? `${currentList.length} Treffer hinzufügen` : "Alle hinzufügen"}
                  </button>
                  <button type="button" onClick={removeAllShown} className="font-semibold text-text-light hover:text-red-700 hover:underline">
                    Entfernen
                  </button>
                </div>
              </div>
              <ul className="mt-3 max-h-72 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border" aria-label={SOURCE_LABEL[tab]}>
                {currentList.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-text-light">
                    {sourceList(tab).length === 0
                      ? "Keine Einträge in dieser Quelle."
                      : "Keine Treffer."}
                  </li>
                ) : (
                  currentList.map((r) => {
                    const checked = selected.has(r.email.toLowerCase());
                    return (
                      <li key={r.id}>
                        <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors ${checked ? "bg-primary/5" : "hover:bg-bg"}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSelected(r.email)}
                            className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-accent-strong" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-text">{r.full_name || r.email}</span>
                            <span className="block truncate text-xs text-text-light">
                              {r.full_name ? r.email : null}
                              {r.full_name && r.school ? " · " : null}
                              {r.school ?? null}
                            </span>
                          </span>
                          {tab === "accounts" &&
                            (r.confirmed ? (
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="bestätigt" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="unbestätigt" />
                            ))}
                        </label>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          )}
        </div>
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

          {/* KI-Konvertierungs-Prompt – ausklappbar, damit er nicht
              dauerhaft Platz wegnimmt, aber bei Bedarf schnell zur
              Hand ist. */}
          <details className="group rounded-xl border border-primary-light/30 bg-primary-light/5">
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 list-none [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <Wand2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                  Bestehende Mail in DigiKI-Style umwandeln
                </p>
                <p className="mt-0.5 text-[13px] text-text-light">
                  Prompt kopieren und in ChatGPT / Claude einfügen – Antwort hier rein.
                </p>
              </div>
              <span className="text-text-light transition-transform group-open:rotate-180">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="border-t border-primary-light/30 px-4 py-3 space-y-3">
              <p className="text-[13px] text-text-light leading-relaxed">
                Den Prompt unten in einen beliebigen KI-Chat einfügen, am
                Ende den Original-Mailtext einsetzen. Das Ergebnis (reines
                Body-HTML) anschließend in das HTML-Feld unten kopieren –
                Header, Logo und Footer fügt dieses Tool automatisch hinzu.
              </p>
              <div className="relative">
                <textarea
                  id="ai-prompt-textarea"
                  readOnly
                  value={AI_CONVERT_PROMPT}
                  rows={6}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-text resize-y"
                  style={{ minHeight: 140 }}
                />
                <button
                  type="button"
                  onClick={copyPrompt}
                  className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                    promptCopied
                      ? "bg-emerald-600 text-white"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {promptCopied ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Prompt kopieren
                    </>
                  )}
                </button>
              </div>
            </div>
          </details>

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

          {/* Versand an die zusammengestellte Empfängerliste */}
          <div className="border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={sending || !canSend || finalEmails.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-5 py-3 text-base font-bold text-white transition-colors hover:bg-accent-strong/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              An {finalEmails.length} Empfänger versenden
            </button>
            <p className="mt-2 text-center text-xs text-text-light">
              {finalEmails.length === 0
                ? "Wählen Sie oben mindestens einen Empfänger aus (oder fügen Sie eine Adresse hinzu)."
                : "Versand erfolgt einzeln (kein BCC), DSGVO-konform."}
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
              // allow-same-origin sorgt dafür, dass externe Ressourcen
              // (Logo, Schriften) sauber laden. KEIN allow-scripts –
              // das HTML kann also keinen Code im Editor-Kontext ausführen.
              sandbox="allow-same-origin"
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
                  An {finalEmails.length} Empfänger senden?
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
                    Zusammensetzung
                  </p>
                  <p className="mt-1 font-medium text-text">
                    {countSelectedIn("accounts")} Konten · {countSelectedIn("participants")} Teilnehmer ·{" "}
                    {countSelectedIn("contacts")} Ansprechpartner · {countSelectedIn("manual")} manuell
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
              {finalEmails.length > 0 && (
                <details className="rounded-lg border border-border bg-bg/40 p-3">
                  <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
                    Erste Empfänger anzeigen
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-text-light">
                    {finalEmails.slice(0, 10).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                    {finalEmails.length > 10 && (
                      <li className="italic">
                        … und {finalEmails.length - 10} weitere
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
