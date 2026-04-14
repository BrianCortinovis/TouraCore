-- 00011: Trigger auto-creazione profilo su registrazione utente
-- Quando un utente si registra tramite Supabase Auth, viene creato
-- automaticamente un record in profiles con valori di default.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Policy INSERT per profili: necessaria per service role trigger
-- Il trigger usa SECURITY DEFINER quindi bypassa RLS,
-- ma aggiungiamo policy per completezza
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
