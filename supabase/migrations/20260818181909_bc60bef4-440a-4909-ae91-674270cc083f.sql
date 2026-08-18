CREATE TABLE public.owner_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  owner_name text NOT NULL,
  owner_email text,
  owner_phone text,
  owner_tax_id text,
  owner_address text,
  property_address text,
  management_fee_percent numeric NOT NULL DEFAULT 20,
  onboarding_fee_cents integer NOT NULL DEFAULT 49900,
  currency text NOT NULL DEFAULT 'ron',
  contract_body text,
  status text NOT NULL DEFAULT 'draft',
  signature_name text,
  signature_ip text,
  signature_user_agent text,
  signed_at timestamptz,
  otp_code_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer NOT NULL DEFAULT 0,
  stripe_session_id text,
  payment_amount_cents integer,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_contracts TO authenticated;
GRANT ALL ON public.owner_contracts TO service_role;
ALTER TABLE public.owner_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage owner contracts"
  ON public.owner_contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_owner_contracts_lead ON public.owner_contracts(lead_id);
CREATE INDEX idx_owner_contracts_status ON public.owner_contracts(status);

CREATE TRIGGER owner_contracts_updated_at
  BEFORE UPDATE ON public.owner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_email_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.owner_contracts(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  sender text,
  subject text NOT NULL,
  html_body text,
  error_message text,
  http_status integer,
  source text NOT NULL DEFAULT 'unknown',
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.admin_email_failures TO authenticated;
GRANT ALL ON public.admin_email_failures TO service_role;
ALTER TABLE public.admin_email_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read email failures"
  ON public.admin_email_failures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins update email failures"
  ON public.admin_email_failures FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins delete email failures"
  ON public.admin_email_failures FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_admin_email_failures_created ON public.admin_email_failures(created_at DESC);