alter table public.transacoes
    add column if not exists urgencia_id uuid
    references public.solicitacoes_urgentes(id) on delete set null;

create index if not exists transacoes_urgencia_id_idx
    on public.transacoes (urgencia_id);

comment on column public.transacoes.urgencia_id is
    'Ruptura de estoque que originou a oferta do fornecedor.';
