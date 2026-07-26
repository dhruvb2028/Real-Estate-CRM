-- =============================================================
-- EstateFlow CRM — 0005: WhatsApp delivery mode
--
-- Twilio's WhatsApp API requires Meta business verification per sender, which
-- takes days to weeks. "deep_link" mode works from day one: the agent taps
-- WhatsApp and their own app opens with the message pre-filled, so the client
-- gets the feature immediately and messages come from the agent's real number.
-- Clients who complete verification switch to "api" for automated sending.
-- =============================================================

create type whatsapp_mode as enum ('deep_link', 'api');

alter table integration_settings
  add column if not exists whatsapp_mode whatsapp_mode not null default 'deep_link';

comment on column integration_settings.whatsapp_mode is
  'deep_link = open wa.me on the agent device (no verification needed); api = send via Twilio WhatsApp (requires verified sender)';
