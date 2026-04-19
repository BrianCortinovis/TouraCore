-- M088 follow-up: seed notification templates for client invite + team invite

INSERT INTO public.notification_templates (key, channel, locale, scope, subject, body_html, body_text, variables, is_active, version)
VALUES
(
  'agency.client.invite_sent',
  'email',
  'it',
  'agency',
  'Invito da {{agency.name}} — crea il tuo account',
  '<!DOCTYPE html><html><body style="font-family: -apple-system, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
<div style="background: {{brand.color}}; padding: 20px; color: white; border-radius: 8px 8px 0 0;">
  <h2 style="margin: 0;">{{agency.name}}</h2>
</div>
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
<p>Ciao,</p>
<p><strong>{{agency.name}}</strong> ti ha invitato a gestire la tua {{invite.vertical}} tramite TouraCore.</p>
<p>Clicca il pulsante per creare il tuo account. Verrai automaticamente collegato all''agenzia.</p>
<p style="text-align: center; margin: 32px 0;">
  <a href="{{invite.accept_url}}" style="background: {{brand.color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Crea account</a>
</p>
<p style="color: #6b7280; font-size: 13px;">Questo link scade tra 14 giorni. Se non hai richiesto l''invito, ignora l''email.</p>
</div></body></html>',
  'Invito da {{agency.name}}

{{agency.name}} ti ha invitato a gestire la tua {{invite.vertical}} tramite TouraCore.

Crea il tuo account: {{invite.accept_url}}

Link scade tra 14 giorni.',
  '{"agency.name":"","invite.accept_url":"","invite.vertical":"","brand.color":""}'::jsonb,
  true,
  1
),
(
  'team.invite_sent',
  'email',
  'it',
  'agency',
  'Invito a {{agency.name}} (team)',
  '<!DOCTYPE html><html><body style="font-family: -apple-system, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
<div style="background: {{brand.color}}; padding: 20px; color: white; border-radius: 8px 8px 0 0;">
  <h2 style="margin: 0;">{{agency.name}}</h2>
</div>
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
<p>Ciao,</p>
<p>Sei stato invitato a entrare nel team di <strong>{{agency.name}}</strong> su TouraCore.</p>
<p style="text-align: center; margin: 32px 0;">
  <a href="{{invite.accept_url}}" style="background: {{brand.color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accetta invito</a>
</p>
<p style="color: #6b7280; font-size: 13px;">Link scade tra 7 giorni.</p>
</div></body></html>',
  'Invito team {{agency.name}}

Accetta: {{invite.accept_url}}

Scade tra 7 giorni.',
  '{"agency.name":"","invite.accept_url":"","brand.color":""}'::jsonb,
  true,
  1
)
ON CONFLICT DO NOTHING;
