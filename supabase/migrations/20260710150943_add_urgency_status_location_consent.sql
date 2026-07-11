alter table public.solicitacoes_urgentes
  add column if not exists estado text,
  add column if not exists whatsapp_status_consent boolean not null default false;

alter table public.instituicoes
  add column if not exists estado text;

comment on column public.solicitacoes_urgentes.whatsapp_status_consent is
  'Autorização explícita do solicitante para publicar a ruptura no Status do WhatsApp regional.';
