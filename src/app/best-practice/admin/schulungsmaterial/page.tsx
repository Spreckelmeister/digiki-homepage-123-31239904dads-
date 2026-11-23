import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/schulungen/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import MaterialAdmin from "@/components/material/MaterialAdmin";
import BlockedDomainsManager from "@/components/material/BlockedDomainsManager";
import type { MaterialItem } from "@/lib/material/shared";

export const metadata: Metadata = {
  title: "Schulungsmaterial - Admin",
  description: "Schulungsmaterial hochladen und freischalten.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface MaterialAccount {
  id: string;
  school: string;
  full_name: string;
  email: string;
  confirmed: boolean;
  created_at: string;
}

/**
 * Schulkonten OHNE Bestandsaufnahme (= nur Schulungsmaterial). Sie tauchen
 * in der Bestandsaufnahme-Liste nicht auf, deshalb hier eine eigene
 * Übersicht. Braucht den Service-Role-Key (E-Mail-Adressen aus auth.users).
 */
async function loadMaterialAccounts(): Promise<MaterialAccount[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const admin = createServiceClient();
  const [{ data: profiles }, { data: bsa }, { data: usersData }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, school, role, created_at")
        .eq("role", "teacher"),
      admin.from("bestandsaufnahme_responses").select("user_id, contact_email"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const bsaUserIds = new Set((bsa ?? []).map((r) => r.user_id).filter(Boolean));
  const bsaEmails = new Set(
    (bsa ?? []).map((r) => (r.contact_email ?? "").toLowerCase()).filter(Boolean)
  );
  const userById = new Map((usersData?.users ?? []).map((u) => [u.id, u]));

  return (profiles ?? [])
    .map((p) => {
      const u = userById.get(p.id);
      return {
        id: p.id as string,
        school: (p.school as string) ?? "",
        full_name: (p.full_name as string) ?? "",
        email: u?.email ?? "",
        confirmed: Boolean(u?.email_confirmed_at),
        created_at: (u?.created_at ?? p.created_at) as string,
      };
    })
    .filter(
      (a) => !bsaUserIds.has(a.id) && !(a.email && bsaEmails.has(a.email.toLowerCase()))
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export default async function SchulungsmaterialAdminPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  // Die Seite nutzt den Service-Role-Key – Rolle deshalb hier ausdrücklich
  // prüfen (zusätzlich zur Middleware).
  if (profile?.role?.toLowerCase() !== "admin") {
    redirect("/best-practice/datenbank");
  }

  const { data: itemData, error: itemError } = await supabase
    .from("schulungsmaterial")
    .select("*")
    .order("sort_order")
    .order("created_at");
  const items = (itemData ?? []) as MaterialItem[];

  const { data: domainData, error: domainError } = await supabase
    .from("blocked_email_domains")
    .select("domain")
    .order("domain");
  const domains = (domainData ?? []).map((d) => d.domain as string);

  const accounts = await loadMaterialAccounts();

  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Admin-Bereich
              </h1>
              <p className="text-lg text-white/70">
                Schulungsmaterial hochladen und für Schulen freischalten.
              </p>
              <AdminNav />
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          {itemError ? (
            <p role="alert" className="rounded-xl border border-border bg-white p-6 text-sm text-text-light">
              Der Bereich ist noch nicht eingerichtet – bitte zuerst Migration
              038 im Supabase SQL Editor ausführen.
            </p>
          ) : (
            <MaterialAdmin items={items} />
          )}

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-primary mb-1">
              Schulen nur mit Schulungsmaterial ({accounts.length})
            </h2>
            <p className="text-sm text-text-light mb-4">
              Konten ohne Bestandsaufnahme: Zugriff auf das Schulungsmaterial,
              aber keine Anträge und keine Best-Practice-Datenbank.
            </p>
            {accounts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-text-light">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-medium">Schule</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Ansprechperson</th>
                      <th scope="col" className="py-2 pr-4 font-medium">E-Mail</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Registriert</th>
                      <th scope="col" className="py-2 font-medium">Bestätigt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 pr-4 text-text">{a.school}</td>
                        <td className="py-2 pr-4">{a.full_name}</td>
                        <td className="py-2 pr-4">{a.email}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleDateString("de-DE")}
                        </td>
                        <td className="py-2">{a.confirmed ? "Ja" : "Nein"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <BlockedDomainsManager
            domains={domains}
            unavailable={Boolean(domainError)}
          />
        </div>
      </section>
    </>
  );
}
