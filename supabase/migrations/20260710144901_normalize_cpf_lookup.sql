create or replace function public.check_user_by_cpf(input_cpf text)
returns table (
  found boolean,
  user_email text,
  user_name text,
  institution_name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    true,
    p.email,
    p.nome,
    i.nome_fantasia
  from public.perfis_usuarios p
  left join public.instituicoes i on p.instituicao_id = i.id
  where regexp_replace(coalesce(p.cpf, ''), '[^0-9]', '', 'g') =
        regexp_replace(coalesce(input_cpf, ''), '[^0-9]', '', 'g')
    and length(regexp_replace(coalesce(input_cpf, ''), '[^0-9]', '', 'g')) = 11
  limit 1;

  if not found then
    return query select false, null::text, null::text, null::text;
  end if;
end;
$$;

revoke all on function public.check_user_by_cpf(text) from public;
grant execute on function public.check_user_by_cpf(text) to anon, authenticated;
