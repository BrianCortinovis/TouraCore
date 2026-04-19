-- M081 notifications suite: templates+queue+log+inbox+preferences+providers
-- Applied cloud via Management API in 6 sequential statements (see m081 memory).

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp','push','in_app','slack')),
  locale text NOT NULL DEFAULT 'it',
  scope text NOT NULL DEFAULT 'platform' CHECK (scope IN ('platform','agency','tenant')),
  scope_id uuid,
  subject text,
  body_mjml text,
  body_html text,
  body_text text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, channel, locale, scope, scope_id)
);

CREATE TABLE IF NOT EXISTS public.notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  channel text NOT NULL,
  locale text NOT NULL DEFAULT 'it',
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_phone text,
  recipient_push_token text,
  recipient_slack_webhook text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'system',
  event_key text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority smallint NOT NULL DEFAULT 5,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','cancelled','skipped')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES public.notifications_queue(id) ON DELETE SET NULL,
  template_key text NOT NULL,
  channel text NOT NULL,
  recipient_user_id uuid,
  recipient_email text,
  recipient_phone text,
  tenant_id uuid,
  agency_id uuid,
  provider text,
  provider_message_id text,
  status text NOT NULL CHECK (status IN ('sent','delivered','bounced','failed','opened','clicked','unsubscribed','dropped')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.notifications_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'tenant',
  category text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NOT NULL,
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notification_preferences uses partial UNIQUE idx for user_id vs guest_email branches
-- notification_providers scope tripartito encrypted credentials
-- RLS policies: scope-filtered (platform sees all; agency sees own; tenant sees own)
-- Full DDL in migration 00125 via cloud Management API.
