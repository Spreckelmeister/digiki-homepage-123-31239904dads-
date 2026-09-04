"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, ClipboardList, Inbox, BarChart2, Mail, GraduationCap } from "lucide-react";

const tabs = [
  {
    label: "Best Practice",
    href: "/best-practice/admin",
    icon: FileText,
    match: (path: string) =>
      path === "/best-practice/admin" ||
      path.includes("/bearbeiten") ||
      path === "/best-practice/admin/neu",
  },
  {
    label: "Anträge",
    href: "/best-practice/admin/antraege",
    icon: ClipboardList,
    match: (path: string) => path.startsWith("/best-practice/admin/antraege"),
  },
  {
    label: "Kontakt",
    href: "/best-practice/admin/kontakt",
    icon: Inbox,
    match: (path: string) => path.startsWith("/best-practice/admin/kontakt"),
  },
  {
    label: "Bestandsaufnahme",
    href: "/best-practice/admin/bestandsaufnahme",
    icon: BarChart2,
    match: (path: string) =>
      path.startsWith("/best-practice/admin/bestandsaufnahme"),
  },
  {
    label: "E-Mails",
    href: "/best-practice/admin/mailings",
    icon: Mail,
    match: (path: string) => path.startsWith("/best-practice/admin/mailings"),
  },
  {
    label: "Schulungen",
    href: "/schulungsdashboard",
    icon: GraduationCap,
    match: (path: string) => path.startsWith("/schulungsdashboard"),
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    /* Auf Mobilgeräten scrollt die Tab-Leiste horizontal – Scrollbar wird
     * ausgeblendet. Auf Desktop ändert sich nichts (alle Tabs passen rein). */
    <nav
      aria-label="Admin-Navigation"
      className="mt-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex gap-1 w-max md:w-auto">
        {tabs.map((tab) => {
          const isActive = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
