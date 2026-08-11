"use client";

import { useState } from "react";
import type { EventParticipant, ParticipantRole } from "@/lib/schulungen/types";

export type ParticipantDraft = {
  first_name: string;
  last_name: string;
  email: string;
  role: ParticipantRole;
  school_name: string | null;
};

function draftFrom(p: EventParticipant): ParticipantDraft {
  return {
    first_name: p.first_name,
    last_name: p.last_name,
    // Schul-Account-Fallback ist keine eigene E-Mail → Feld leer lassen.
    email: p.email_via_school ? "" : p.email ?? "",
    role: p.role,
    school_name: p.school_name,
  };
}

/**
 * Zustand + Speichern-Logik für das Inline-Bearbeiten einer Anmeldung in der
 * Teilnehmerliste (Desktop-Modal und Mobile-Sheet teilen sich diesen Hook,
 * die Darstellung bleibt jeweils eigen).
 *
 * Quoten-Ablauf: Erster Speichern-Versuch ohne Override; antwortet der Server
 * mit 409 { quota: true }, wird die Meldung als Bestätigungsfrage angezeigt
 * („Trotzdem speichern" ruft saveEdit(true) auf).
 */
export function useParticipantEdit(
  eventId: string,
  onSaved: () => Promise<void> | void
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParticipantDraft | null>(null);
  const [original, setOriginal] = useState<ParticipantDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [quotaConfirm, setQuotaConfirm] = useState<string | null>(null);

  function startEdit(p: EventParticipant) {
    const d = draftFrom(p);
    setEditingId(p.person_id);
    setDraft(d);
    setOriginal(d);
    setEditError(null);
    setQuotaConfirm(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setOriginal(null);
    setEditError(null);
    setQuotaConfirm(null);
  }

  function updateDraft(patch: Partial<ParticipantDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    // Nach jeder Eingabe eine evtl. offene Quota-Rückfrage zurücksetzen –
    // sie bezog sich auf den vorherigen Stand.
    setQuotaConfirm(null);
  }

  async function saveEdit(override = false) {
    if (!editingId || !draft || !original) return;

    // Nur geänderte Felder senden.
    const payload: Record<string, unknown> = {
      event_id: eventId,
      person_id: editingId,
    };
    if (draft.first_name.trim() !== original.first_name) {
      payload.first_name = draft.first_name.trim();
    }
    if (draft.last_name.trim() !== original.last_name) {
      payload.last_name = draft.last_name.trim();
    }
    if (draft.email.trim() !== original.email) {
      payload.email = draft.email.trim();
    }
    if (draft.role !== original.role) payload.role = draft.role;
    if (draft.school_name && draft.school_name !== original.school_name) {
      payload.school_name = draft.school_name;
    }
    if (override) payload.override = true;

    if (Object.keys(payload).length === 2) {
      // Nichts geändert → einfach schließen.
      cancelEdit();
      return;
    }

    setSaving(true);
    setEditError(null);
    if (!override) setQuotaConfirm(null);
    try {
      const res = await fetch("/api/schulungen/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 409 && body?.quota) {
          setQuotaConfirm(body.error ?? "Die Schul-Quote ist ausgeschöpft.");
          return;
        }
        throw new Error(body?.error ?? "Änderung fehlgeschlagen.");
      }
      cancelEdit();
      await onSaved();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Änderung fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    editingId,
    draft,
    saving,
    editError,
    quotaConfirm,
    startEdit,
    cancelEdit,
    updateDraft,
    saveEdit,
  };
}
