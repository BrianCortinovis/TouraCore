-- M078 S01: platform-wide config (plan pricing + commission tiers + platform fee)
CREATE TABLE IF NOT EXISTS public.platform_config (
  id int PRIMARY KEY DEFAULT 1,
  plans jsonb NOT NULL DEFAULT '{}'::jsonb,
  commission_tiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform_fee_rate numeric(5,4) NOT NULL DEFAULT 0.02,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.platform_config (id, plans, commission_tiers, platform_fee_rate)
VALUES (
  1,
  '{"agency_starter":{"price":99,"max_tenants":3},"agency_pro":{"price":299,"max_tenants":10},"agency_enterprise":{"price":999,"max_tenants":999}}'::jsonb,
  '{"hospitality":[{"threshold":0,"rate":0.10},{"threshold":5000,"rate":0.12},{"threshold":20000,"rate":0.15}],"experience":[{"threshold":0,"rate":0.10},{"threshold":5000,"rate":0.12},{"threshold":20000,"rate":0.15}],"bike":[{"threshold":0,"rate":0.08},{"threshold":5000,"rate":0.10}],"restaurant":[{"threshold":0,"rate":0.05},{"threshold":5000,"rate":0.08}]}'::jsonb,
  0.02
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_config_select" ON public.platform_config;
CREATE POLICY "platform_config_select" ON public.platform_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "platform_config_update" ON public.platform_config;
CREATE POLICY "platform_config_update" ON public.platform_config FOR UPDATE USING (public.is_platform_admin());
