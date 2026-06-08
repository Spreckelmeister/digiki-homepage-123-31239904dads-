import type { Metadata } from "next";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import BulkMailingTool from "@/components/best-practice/BulkMailingTool";

export const metadata: Metadata = {
  title: "Admin – E-Mails",
  description: "E-Mails an alle DigiKI-Accounts versenden.",
  robots: { index: false, follow: false },
};

// Empfänger werden zur Laufzeit gezogen – kein Caching.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMailingsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                E-Mails
              </h1>
              <p className="text-lg text-white/70">
                HTML-E-Mails an alle registrierten DigiKI-Accounts versenden.
              </p>
              <AdminNav />
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BulkMailingTool adminEmail={user?.email ?? ""} />
        </div>
      </section>
    </>
  );
}
