-- ============================================================
-- DigiKI: Migration 015 – Online-Klassenbildung
--
-- Ziel: Eltern können sich über einen QR-Code an der Schul-Tafel
--       direkt mit Wünschen anmelden (auch wenn die anderen Kinder
--       sich noch nicht eingetragen haben). Schulleitung sieht die
--       Anmeldungen live im Dashboard und kann nach der Verteilung
--       die Eltern automatisch per E-Mail informieren.
--
-- Tabellen:
--   • klassenbildung_sessions       – Anmelde-Sessions der Lehrkraft
--   • klassenbildung_registrations  – Eltern-Anmeldungen pro Kind
--
-- Ausführen im Supabase SQL Editor.
-- ============================================================

-- ── 1) klassenbildung_sessions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.klassenbildung_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- öffentlicher Code für die Eltern-URL (z. B. "K3J9-X7P2")
  code            text NOT NULL UNIQUE,

  -- Anzeige für Lehrkraft + Eltern
  name            text NOT NULL,
  school_name     text,

  -- 'open' = Eltern können sich anmelden
  -- 'closed' = keine neuen Anmeldungen, Verteilung läuft
  -- 'assigned' = Klassenzuteilung erfolgt, Eltern wurden / werden benachrichtigt
  status          text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','closed','assigned')),

  max_wishes      integer NOT NULL DEFAULT 2 CHECK (max_wishes BETWEEN 1 AND 5),

  -- Optional: vorausgewählter Empfänger-Hinweis im Mail-Body
  notify_subject  text,
  notify_body     text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_sessions_code
  ON public.klassenbildung_sessions(code);
CREATE INDEX IF NOT EXISTS idx_kb_sessions_user
  ON public.klassenbildung_sessions(user_id);

-- ── 2) klassenbildung_registrations ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.klassenbildung_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL
                   REFERENCES public.klassenbildung_sessions(id) ON DELETE CASCADE,

  -- Kind
  child_name      text NOT NULL,
  gender          text CHECK (gender IN ('m','w','x')),
  notes           text,
  prev_class      text,

  -- Eltern-Kontakt für Rückmeldung
  parent_email    text,
  parent_name     text,

  -- Wünsche / NoGo / Geschwister als Freitext-Listen
  -- (Parents können Namen eintippen, auch wenn das Kind sich noch
  --  nicht angemeldet hat – Matching erfolgt server-/client-seitig)
  wishes          text[] NOT NULL DEFAULT '{}',
  no_go           text[] NOT NULL DEFAULT '{}',
  siblings        text[] NOT NULL DEFAULT '{}',

  -- Nach Klassenzuteilung
  assigned_class  integer,
  notified_at     timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_regs_session
  ON public.klassenbildung_registrations(session_id);

-- ── 3) RLS aktivieren ─────────────────────────────────────────────
ALTER TABLE public.klassenbildung_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.klassenbildung_registrations ENABLE ROW LEVEL SECURITY;

-- ── 4) Sessions: Lehrkraft sieht/verwaltet eigene Sessions ────────
DROP POLICY IF EXISTS "kb_sessions_owner_select" ON public.klassenbildung_sessions;
CREATE POLICY "kb_sessions_owner_select"
  ON public.klassenbildung_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "kb_sessions_owner_insert" ON public.klassenbildung_sessions;
CREATE POLICY "kb_sessions_owner_insert"
  ON public.klassenbildung_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kb_sessions_owner_update" ON public.klassenbildung_sessions;
CREATE POLICY "kb_sessions_owner_update"
  ON public.klassenbildung_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kb_sessions_owner_delete" ON public.klassenbildung_sessions;
CREATE POLICY "kb_sessions_owner_delete"
  ON public.klassenbildung_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── 5) Registrations: Lehrkraft sieht/verwaltet eigene ────────────
DROP POLICY IF EXISTS "kb_regs_owner_select" ON public.klassenbildung_registrations;
CREATE POLICY "kb_regs_owner_select"
  ON public.klassenbildung_registrations
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.klassenbildung_sessions WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "kb_regs_owner_update" ON public.klassenbildung_registrations;
CREATE POLICY "kb_regs_owner_update"
  ON public.klassenbildung_registrations
  FOR UPDATE TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.klassenbildung_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.klassenbildung_sessions WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "kb_regs_owner_delete" ON public.klassenbildung_registrations;
CREATE POLICY "kb_regs_owner_delete"
  ON public.klassenbildung_registrations
  FOR DELETE TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.klassenbildung_sessions WHERE user_id = auth.uid()
    )
  );

-- Eltern-INSERT laufen nicht über RLS; die API-Route nutzt den
-- SUPABASE_SERVICE_ROLE_KEY und prüft Status ('open') + Limits selbst,
-- damit Anonyme keinen direkten Tabellen-Zugriff haben.
