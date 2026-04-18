-- 00101: Drop dead promo tables prima di unified credit system
-- Rimuove tabelle mai integrate nel checkout (verificato audit):
-- - promotion_applications (zero referrer, dead)
-- - promo_codes (hospitality promo, admin UI solo cosmetic)
-- - promotions (hospitality, admin UI non wired a checkout)
-- - restaurant_promotions (admin UI rimossa, 3 seed demo non usati)
--
-- Backward compat: tutte le UI route che usavano queste tabelle sono state rimosse.
-- Zero booking flow passa per queste tabelle.
-- Sostituite da credit_instruments + credit_transactions (00102).

BEGIN;

DROP TABLE IF EXISTS public.promotion_applications CASCADE;
DROP TABLE IF EXISTS public.promo_codes CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.restaurant_promotions CASCADE;

COMMIT;
