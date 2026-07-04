create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_institution_id uuid;
  metadata_is_active boolean;
begin
  metadata_institution_id := nullif(new.raw_user_meta_data->>'instituicao_id', '')::uuid;

  if new.raw_user_meta_data ? 'is_active' then
    metadata_is_active := (new.raw_user_meta_data->>'is_active')::boolean;
  end if;

  insert into public.perfis_usuarios (
    id,
    nome,
    email,
    instituicao_id,
    role,
    cpf,
    whatsapp,
    is_active
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    metadata_institution_id,
    coalesce(new.raw_user_meta_data->>'role', 'OPERADOR'),
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'whatsapp',
    coalesce(metadata_is_active, false)
  )
  on conflict (id) do update
  set
    nome = coalesce(excluded.nome, public.perfis_usuarios.nome),
    email = coalesce(excluded.email, public.perfis_usuarios.email),
    instituicao_id = coalesce(excluded.instituicao_id, public.perfis_usuarios.instituicao_id),
    role = coalesce(excluded.role, public.perfis_usuarios.role),
    cpf = coalesce(excluded.cpf, public.perfis_usuarios.cpf),
    whatsapp = coalesce(excluded.whatsapp, public.perfis_usuarios.whatsapp),
    is_active = case
      when new.raw_user_meta_data ? 'is_active' then excluded.is_active
      else public.perfis_usuarios.is_active
    end;

  return new;
end;
$$;

update public.perfis_usuarios profile
set instituicao_id = nullif(auth_user.raw_user_meta_data->>'instituicao_id', '')::uuid
from auth.users auth_user
where profile.id = auth_user.id
  and profile.instituicao_id is null
  and nullif(auth_user.raw_user_meta_data->>'instituicao_id', '') is not null;

update public.perfis_usuarios profile
set is_active = (auth_user.raw_user_meta_data->>'is_active')::boolean
from auth.users auth_user
where profile.id = auth_user.id
  and auth_user.raw_user_meta_data ? 'is_active';

update public.perfis_usuarios profile
set is_active = true
from public.instituicoes institution
where profile.instituicao_id = institution.id
  and profile.role = 'UNIDADE_ADM'
  and institution.status = 'ATIVO'
  and profile.is_active = false;
