ALTER TABLE public.owner_contracts
  ADD COLUMN IF NOT EXISTS contract_pdf_path text,
  ADD COLUMN IF NOT EXISTS contract_pdf_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_owner_contracts_lead_id ON public.owner_contracts(lead_id);