"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, ClipboardList } from "lucide-react";

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
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 mt-4" aria-label="Admin-Navigation">
      {tabs.map((tab) => {
        const isActive = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
