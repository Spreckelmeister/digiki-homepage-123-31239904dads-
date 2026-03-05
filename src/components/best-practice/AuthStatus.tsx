"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function AuthStatus() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    loadProfile();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/best-practice");
    router.refresh();
  }

  if (!profile) return null;

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-white/70">
        Angemeldet als <strong className="text-white">{profile.full_name}</strong>
      </span>
      {profile.role === "admin" && (
        <Link
          href="/best-practice/admin"
          className="inline-flex items-center gap-1 text-white/70 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
          Admin
        </Link>
      )}
      <button
        onClick={handleLogout}
        className="inline-flex items-center gap-1 text-white/70 hover:text-white transition-colors"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" />
        Abmelden
      </button>
    </div>
  );
}
