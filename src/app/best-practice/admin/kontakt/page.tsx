import type { Metadata } from "next";
import { CheckCircle2, Inbox } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import ContactRequestsTable, {
  type ContactRequestRow,
} from "@/components/best-practice/ContactRequestsTable";

export const metadata: Metadata = {
  title: "Kontaktanfragen - Admin",
  description: "Eingegangene Kontaktanfragen verwalten.",
  robots: { index: false, follow: false },
};

export default async function KontaktAdminPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data } = await supabase
    .from("contact_requests")
    .select("id, name, email, school_name, topic, message, status, created_at")
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as ContactRequestRow[];
  const neuCount = requests.filter((r) => r.status === "neu").length;
  const inBearbeitungCount = requests.filter(
    (r) => r.status === "in_bearbeitung",
  ).length;
  const beantwortetCount = requests.filter(
    (r) => r.status === "beantwortet",
  ).length;

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Admin-Bereich
              </h1>
              <p className="text-lg text-white/70">
                Kontaktanfragen aus dem Website-Formular verwalten.
              </p>
              <AdminNav />
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm text-text-light">
              <Inbox className="w-4 h-4" aria-hidden="true" />
              <span>
                <strong className="text-text">{requests.length}</strong> Gesamt
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-light">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>
                <strong className="text-text">{neuCount}</strong> Neu
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-light">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>
                <strong className="text-text">{inBearbeitungCount}</strong> In
                Bearbeitung
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-light">
              <CheckCircle2
                className="w-4 h-4 text-green-600"
                aria-hidden="true"
              />
              <span>
                <strong className="text-text">{beantwortetCount}</strong>{" "}
                Beantwortet
              </span>
            </div>
          </div>

          <ContactRequestsTable requests={requests} />
        </div>
      </section>
    </>
  );
}
