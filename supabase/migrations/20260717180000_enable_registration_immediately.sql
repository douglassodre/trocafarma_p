create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_institution_id uuid;
begin
  metadata_institution_id := nullif(new.raw_user_meta_data->>'instituicao_id', '')::uuid;

  insert into public.perfis_usuarios (
    id, nome, email, instituicao_id, role, cpf, whatsapp, is_active
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    metadata_institution_id,
    coalesce(new.raw_user_meta_data->>'role', 'OPERADOR'),
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'whatsapp',
    true
  )
  on conflict (id) do update
  set
    nome = coalesce(excluded.nome, public.perfis_usuarios.nome),
    email = coalesce(excluded.email, public.perfis_usuarios.email),
    instituicao_id = coalesce(excluded.instituicao_id, public.perfis_usuarios.instituicao_id),
    role = coalesce(excluded.role, public.perfis_usuarios.role),
    cpf = coalesce(excluded.cpf, public.perfis_usuarios.cpf),
    whatsapp = coalesce(excluded.whatsapp, public.perfis_usuarios.whatsapp),
    is_active = public.perfis_usuarios.is_active;

  return new;
end;
$$;

update public.instituicoes
set status = 'ATIVO'
where status = 'PENDENTE';

update public.perfis_usuarios
set is_active = true
where is_active is distinct from true;
