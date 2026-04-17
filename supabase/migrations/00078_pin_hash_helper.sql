-- 00078: RPC helpers per pin hash (bcrypt via pgcrypto)
-- Permette set/verify PIN senza inviare plaintext via API client

CREATE OR REPLACE FUNCTION public.set_staff_pin(p_staff_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  -- Verifica staff esiste
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.restaurant_staff
  WHERE id = p_staff_id;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  -- Verifica caller ha access al restaurant via RLS check
  IF NOT (v_restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Validate PIN length
  IF p_pin IS NULL OR LENGTH(p_pin) < 4 OR LENGTH(p_pin) > 10 THEN
    RAISE EXCEPTION 'PIN must be 4-10 chars';
  END IF;

  UPDATE public.restaurant_staff
  SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
      pin_code = NULL,
      updated_at = NOW()
  WHERE id = p_staff_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_staff_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(UUID, TEXT) TO authenticated;

-- Crea staff atomic con PIN hashato
CREATE OR REPLACE FUNCTION public.create_staff_with_pin(
  p_restaurant_id UUID,
  p_full_name TEXT,
  p_role TEXT,
  p_pin TEXT,
  p_hourly_rate NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff_id UUID;
  v_pin_hash TEXT;
BEGIN
  -- Authorization
  IF NOT (p_restaurant_id = ANY(get_user_restaurant_ids()) OR is_platform_admin()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_pin IS NOT NULL THEN
    IF LENGTH(p_pin) < 4 OR LENGTH(p_pin) > 10 THEN
      RAISE EXCEPTION 'PIN must be 4-10 chars';
    END IF;
    v_pin_hash := extensions.crypt(p_pin, extensions.gen_salt('bf', 8));
  END IF;

  INSERT INTO public.restaurant_staff (restaurant_id, full_name, role, pin_hash, hourly_rate)
  VALUES (p_restaurant_id, p_full_name, p_role, v_pin_hash, p_hourly_rate)
  RETURNING id INTO v_staff_id;

  RETURN v_staff_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_staff_with_pin(UUID, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_with_pin(UUID, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
