import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, FileText, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import AdminNav from "@/components/best-practice/AdminNav";
import ApplicationsTable from "@/components/best-practice/ApplicationsTable";

export const metadata: Metadata = {
  title: "Anträge - Admin",
  description: "Eingegangene Anträge verwalten.",
};

export default async function AntraegePage() {
  const supabase = await createClient();

  const [{ data: studentApps }, { data: toolApps }] = await Promise.all([
    supabase
      .from("applications_student_assistants")
      .select("id, school_name, contact_person, email, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("applications_tool_licenses")
      .select("id, school_name, contact_person, email, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const applications = [
    ...(studentApps || []).map((app) => ({
      ...app,
      type: "hilfskraefte" as const,
    })),
    ...(toolApps || []).map((app) => ({
      ...app,
      type: "tool-lizenzen" as const,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const neuCount = applications.filter((a) => a.status === "neu").length;
  const inBearbeitungCount = applications.filter(
    (a) => a.status === "in_bearbeitung"
  ).length;
  const studentCount = applications.filter(
    (a) => a.type === "hilfskraefte"
  ).length;
  const toolCount = applications.filter(
    (a) => a.type === "tool-lizenzen"
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
                Eingegangene Anträge verwalten.
              </p>
              <AdminNav />
            </div>
            <AuthStatus />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm text-text-light">
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
              <span>
                <strong className="text-text">{applications.length}</strong>{" "}
                Gesamt
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
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>
                <strong className="text-text">{studentCount}</strong>{" "}
                Hilfskräfte
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-light">
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>
                <strong className="text-text">{toolCount}</strong> Tool-Lizenzen
              </span>
            </div>
          </div>

          <ApplicationsTable applications={applications} />
        </div>
      </section>
    </>
  );
}
