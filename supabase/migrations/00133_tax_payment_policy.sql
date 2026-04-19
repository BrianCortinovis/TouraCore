-- M095: policy pagamento tassa soggiorno (online/onsite/guest_choice)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accommodations') THEN
    ALTER TABLE public.accommodations
      ADD COLUMN IF NOT EXISTS tourist_tax_payment_policy text NOT NULL DEFAULT 'onsite_only'
        CHECK (tourist_tax_payment_policy IN ('online_only','onsite_only','guest_choice'));
  END IF;
END$$;

COMMENT ON COLUMN public.accommodations.tourist_tax_payment_policy IS
  'Modalità pagamento tassa soggiorno: online_only = obbligatorio pagare online al check-in, onsite_only = pagamento solo in struttura, guest_choice = ospite sceglie durante check-in';

-- Track choice fatto dall'ospite (quando policy = guest_choice)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checkin_tokens') THEN
    ALTER TABLE public.checkin_tokens
      ADD COLUMN IF NOT EXISTS tourist_tax_payment_choice text
        CHECK (tourist_tax_payment_choice IN ('online','onsite'));
  END IF;
END$$;
