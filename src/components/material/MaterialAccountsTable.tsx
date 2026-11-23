"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface MaterialAccount {
  id: string;
  school: string;
  full_name: string;
  email: string;
  confirmed: boolean;
  created_at: string;
}

/**
 * Admin › Schulungsmaterial: Schulkonten ohne Bestandsaufnahme. Konten, die
 * gar keiner Schule gehören (Team, Schulungspersonal, Testkonten), lassen
 * sich als „intern" markieren und verschwinden dann aus dieser Übersicht
 * und aus dem Rundmail-Filter (Migration 039).
 */
export default function MaterialAccountsTable({
  accounts,
  internal,
  canMark,
}: {
  accounts: MaterialAccount[];
  internal: MaterialAccount[];
  /** false = Migration 039 fehlt. */
  canMark: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function setInternal(account: MaterialAccount, value: boolean) {
    setBusyId(account.id);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: dbError } = value
      ? await supabase
          .from("internal_accounts")
          .upsert({ user_id: account.id, created_by: user?.id ?? null })
      : await supabase.from("internal_accounts").delete().eq("user_id", account.id);
    setBusyId(null);
    if (dbError) {
      setError("Die Änderung konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  const renderTable = (rows: MaterialAccount[], isInternal: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-text-light">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">Schule</th>
            <th scope="col" className="py-2 pr-4 font-medium">Ansprechperson</th>
            <th scope="col" className="py-2 pr-4 font-medium">E-Mail</th>
            <th scope="col" className="py-2 pr-4 font-medium">Registriert</th>
            <th scope="col" className="py-2 pr-4 font-medium">Bestätigt</th>
            {canMark && <th scope="col" className="py-2 font-medium">Aktion</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="py-2 pr-4 text-text">{a.school}</td>
              <td className="py-2 pr-4">{a.full_name}</td>
              <td className="py-2 pr-4">{a.email}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {new Date(a.created_at).toLocaleDateString("de-DE")}
              </td>
              <td className="py-2 pr-4">{a.confirmed ? "Ja" : "Nein"}</td>
              {canMark && (
                <td className="py-2 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => setInternal(a, !isInternal)}
                    className="font-medium text-primary underline hover:text-primary/80 disabled:opacity-50"
                  >
                    {isInternal ? "Wieder als Schule führen" : "Internes Konto"}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-primary mb-1">
        Schulen nur mit Schulungsmaterial ({accounts.length})
      </h2>
      <p className="text-sm text-text-light mb-4">
        Schulkonten ohne Bestandsaufnahme: Zugriff auf das Schulungsmaterial,
        aber keine Anträge und keine Best-Practice-Datenbank. Admin- und
        Schulungsteam-Konten stehen hier nie.
        {canMark &&
          " Gehört ein Konto keiner Schule (Team, Schulungspersonal, Testkonto), blenden Sie es mit „Internes Konto“ aus."}
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {accounts.length > 0 && renderTable(accounts, false)}

      {internal.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Interne Konten ({internal.length})
          </summary>
          <div className="mt-3">{renderTable(internal, true)}</div>
        </details>
      )}
    </div>
  );
}
