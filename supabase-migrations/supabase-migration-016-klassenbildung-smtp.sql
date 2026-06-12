-- ============================================================
-- DigiKI: Migration 016 – Eigener SMTP-Server pro Lehrkraft
--
-- Lehrkräfte können einen eigenen Mail-Server hinterlegen, sodass
-- Klassenzuteilungs-Mails mit der Schul-Domain und ggf. Schul-Logo
-- an Eltern verschickt werden.
--
-- Das Passwort wird AES-256-GCM-verschlüsselt gespeichert
-- (siehe src/lib/klassenbildung/cryptoServer.ts).
--
-- ENV-Variable nötig:
--   SMTP_ENCRYPTION_KEY = base64-encodierter 32-Byte-Schlüssel
-- (z. B. mit `openssl rand -base64 32` erzeugen)
--
-- Ausführen im Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.klassenbildung_smtp_config (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- SMTP-Verbindung
  host           text NOT NULL,
  port           integer NOT NULL CHECK (port BETWEEN 1 AND 65535),
  secure         boolean NOT NULL DEFAULT false,
  smtp_user      text NOT NULL,

  -- AES-256-GCM verschlüsseltes Passwort (alles base64)
  password_enc   text NOT NULL,
  password_iv    text NOT NULL,
  password_tag   text NOT NULL,

  -- Branding / Absender
  from_email     text NOT NULL,
  from_name      text,
  reply_to       text,
  school_name    text,
  school_logo_url text,

  -- Verifizierung
  verified_at    timestamptz,
  last_test_at   timestamptz,
  last_test_error text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.klassenbildung_smtp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_smtp_owner_select" ON public.klassenbildung_smtp_config;
CREATE POLICY "kb_smtp_owner_select"
  ON public.klassenbildung_smtp_config
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "kb_smtp_owner_insert" ON public.klassenbildung_smtp_config;
CREATE POLICY "kb_smtp_owner_insert"
  ON public.klassenbildung_smtp_config
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kb_smtp_owner_update" ON public.klassenbildung_smtp_config;
CREATE POLICY "kb_smtp_owner_update"
  ON public.klassenbildung_smtp_config
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kb_smtp_owner_delete" ON public.klassenbildung_smtp_config;
CREATE POLICY "kb_smtp_owner_delete"
  ON public.klassenbildung_smtp_config
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
