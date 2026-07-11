alter table public.solicitacoes_urgentes
  add column if not exists contato_whatsapp text;

comment on column public.solicitacoes_urgentes.contato_whatsapp is
  'WhatsApp/celular informado pelo solicitante para contato apos uma oferta de atendimento.';
