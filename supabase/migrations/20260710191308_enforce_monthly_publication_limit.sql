create or replace function public.get_publication_access()
returns table (
  allowed boolean,
  is_subscriber boolean,
  publications_used integer,
  publications_limit integer,
  publications_remaining integer,
  subscription_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  profile_record record;
  used_count integer := 0;
  month_start timestamptz :=
    date_trunc('month', now() at time zone 'America/Bahia') at time zone 'America/Bahia';
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.is_premium, p.subscription_status, p.role
    into profile_record
  from public.perfis_usuarios p
  where p.id = current_user_id;

  if profile_record.role in ('ADM', 'SUPER_ADMIN') then
    return query select true, true, 0, 1, 1, coalesce(profile_record.subscription_status, 'admin');
    return;
  end if;

  select
    (select count(*) from public.anuncios a
      where a.usuario_id = current_user_id and a.created_at >= month_start)
    +
    (select count(*) from public.solicitacoes_urgentes s
      where s.usuario_id = current_user_id and s.created_at >= month_start)
  into used_count;

  if coalesce(profile_record.is_premium, false)
     and coalesce(profile_record.subscription_status, '') in ('active', 'trialing') then
    return query select true, true, used_count, 1, 2147483647, profile_record.subscription_status;
  else
    return query select used_count < 1, false, used_count, 1, greatest(0, 1 - used_count),
      coalesce(profile_record.subscription_status, 'inactive');
  end if;
end;
$$;

revoke all on function public.get_publication_access() from public;
grant execute on function public.get_publication_access() to authenticated;

create or replace function public.enforce_monthly_publication_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record record;
  used_count integer := 0;
  month_start timestamptz :=
    date_trunc('month', now() at time zone 'America/Bahia') at time zone 'America/Bahia';
begin
  if new.usuario_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.usuario_id::text, 0));

  select p.is_premium, p.subscription_status, p.role
    into profile_record
  from public.perfis_usuarios p
  where p.id = new.usuario_id;

  if profile_record.role in ('ADM', 'SUPER_ADMIN') then
    return new;
  end if;

  if coalesce(profile_record.is_premium, false)
     and coalesce(profile_record.subscription_status, '') in ('active', 'trialing') then
    return new;
  end if;

  select
    (select count(*) from public.anuncios a
      where a.usuario_id = new.usuario_id and a.created_at >= month_start)
    +
    (select count(*) from public.solicitacoes_urgentes s
      where s.usuario_id = new.usuario_id and s.created_at >= month_start)
  into used_count;

  if used_count >= 1 then
    raise exception 'SUBSCRIPTION_REQUIRED'
      using hint = 'O limite gratuito de uma publicação mensal foi atingido.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_publication_limit_anuncios on public.anuncios;
create trigger enforce_publication_limit_anuncios
before insert on public.anuncios
for each row execute function public.enforce_monthly_publication_limit();

drop trigger if exists enforce_publication_limit_rupturas on public.solicitacoes_urgentes;
create trigger enforce_publication_limit_rupturas
before insert on public.solicitacoes_urgentes
for each row execute function public.enforce_monthly_publication_limit();

revoke all on function public.enforce_monthly_publication_limit() from public, anon, authenticated;
