"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { ApplicationStatus } from "@/lib/types";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

interface ApplicationRow {
  id: string;
  type: "hilfskraefte" | "tool-lizenzen";
  school_name: string;
  contact_person: string;
  email: string;
  status: ApplicationStatus;
  created_at: string;
}

interface ApplicationsTableProps {
  applications: ApplicationRow[];
}

function getTypeLabel(type: string) {
  return type === "hilfskraefte" ? "Stud. Hilfskräfte" : "Tool-Lizenzen";
}

function getTypeBadgeClass(type: string) {
  return type === "hilfskraefte"
    ? "bg-purple-100 text-purple-700"
    : "bg-teal-dark/10 text-teal-dark";
}

function getDetailHref(type: string, id: string) {
  return type === "hilfskraefte"
    ? `/best-practice/admin/antraege/hilfskraefte/${id}`
    : `/best-practice/admin/antraege/tool-lizenzen/${id}`;
}

export default function ApplicationsTable({
  applications,
}: ApplicationsTableProps) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-text-light">
        Noch keine Anträge eingegangen.
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Schule
              </th>
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Typ
              </th>
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Kontakt
              </th>
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Datum
              </th>
              <th className="text-right text-xs font-semibold text-text-light uppercase tracking-wider py-3 px-4">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr
                key={`${app.type}-${app.id}`}
                className="border-b border-border last:border-0"
              >
                <td className="py-4 px-4 text-sm font-medium text-text">
                  {app.school_name}
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex text-xs px-2 py-0.5 rounded-full ${getTypeBadgeClass(app.type)}`}
                  >
                    {getTypeLabel(app.type)}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-text-light">
                  {app.contact_person}
                </td>
                <td className="py-4 px-4">
                  <ApplicationStatusBadge status={app.status} />
                </td>
                <td className="py-4 px-4 text-sm text-text-light">
                  {new Date(app.created_at).toLocaleDateString("de-DE")}
                </td>
                <td className="py-4 px-4 text-right">
                  <Link
                    href={getDetailHref(app.type, app.id)}
                    className="inline-flex items-center gap-1 text-sm text-primary-light hover:text-primary transition-colors"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    Ansehen
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {applications.map((app) => (
          <div
            key={`${app.type}-${app.id}`}
            className="bg-white rounded-xl p-4 shadow-sm border border-border"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-text">
                {app.school_name}
              </h3>
              <ApplicationStatusBadge status={app.status} />
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span
                className={`inline-flex text-xs px-2 py-0.5 rounded-full ${getTypeBadgeClass(app.type)}`}
              >
                {getTypeLabel(app.type)}
              </span>
            </div>
            <p className="text-xs text-text-light mb-3">
              {app.contact_person} &middot;{" "}
              {new Date(app.created_at).toLocaleDateString("de-DE")}
            </p>
            <Link
              href={getDetailHref(app.type, app.id)}
              className="inline-flex items-center gap-1 text-sm text-primary-light hover:text-primary"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Ansehen
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
