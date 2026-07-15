alter table public.anuncios
  add column if not exists termolabil boolean not null default false,
  add column if not exists temperatura_maxima_celsius numeric;

alter table public.anuncios
  drop constraint if exists anuncios_termolabil_temperatura_check;

alter table public.anuncios
  add constraint anuncios_termolabil_temperatura_check
  check (
    (termolabil = false and temperatura_maxima_celsius is null)
    or (termolabil = true and temperatura_maxima_celsius is not null)
  );

comment on column public.anuncios.termolabil is
  'Indica que o medicamento precisa ser mantido refrigerado durante a logística.';

comment on column public.anuncios.temperatura_maxima_celsius is
  'Temperatura máxima permitida para conservação do medicamento termolábil, em graus Celsius.';