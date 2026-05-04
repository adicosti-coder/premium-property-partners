-- Enum for status values
DO $$ BEGIN
  CREATE TYPE public.seo_local_rec_status_enum AS ENUM ('open', 'doing', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.seo_local_rec_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL,
  rec_index INTEGER NOT NULL,
  rec_hash TEXT,
  status public.seo_local_rec_status_enum NOT NULL DEFAULT 'open',
  note TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_local_rec_status_audit_idx
  ON public.seo_local_rec_status (audit_id, rec_index);

CREATE INDEX IF NOT EXISTS seo_local_rec_status_audit_id_idx
  ON public.seo_local_rec_status (audit_id);

ALTER TABLE public.seo_local_rec_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view rec status" ON public.seo_local_rec_status;
CREATE POLICY "Admins can view rec status"
  ON public.seo_local_rec_status
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert rec status" ON public.seo_local_rec_status;
CREATE POLICY "Admins can insert rec status"
  ON public.seo_local_rec_status
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update rec status" ON public.seo_local_rec_status;
CREATE POLICY "Admins can update rec status"
  ON public.seo_local_rec_status
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete rec status" ON public.seo_local_rec_status;
CREATE POLICY "Admins can delete rec status"
  ON public.seo_local_rec_status
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS set_seo_local_rec_status_updated_at ON public.seo_local_rec_status;
CREATE TRIGGER set_seo_local_rec_status_updated_at
  BEFORE UPDATE ON public.seo_local_rec_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();