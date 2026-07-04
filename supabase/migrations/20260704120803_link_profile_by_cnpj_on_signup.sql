create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_institution_id uuid;
  metadata_is_active boolean;
  metadata_cnpj text;
begin
  metadata_cnpj := regexp_replace(coalesce(new.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g');
  metadata_institution_id := nullif(new.raw_user_meta_data->>'instituicao_id', '')::uuid;

  if metadata_institution_id is null and metadata_cnpj <> '' then
    select institution.id
    into metadata_institution_id
    from public.instituicoes institution
    where regexp_replace(coalesce(institution.cnpj, ''), '\D', '', 'g') = metadata_cnpj
    limit 1;
  end if;

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

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

update public.perfis_usuarios profile
set instituicao_id = institution.id
from auth.users auth_user
join public.instituicoes institution
  on regexp_replace(coalesce(institution.cnpj, ''), '\D', '', 'g') =
     regexp_replace(coalesce(auth_user.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g')
where profile.id = auth_user.id
  and profile.instituicao_id is null
  and coalesce(auth_user.raw_user_meta_data->>'cnpj', '') <> '';

update public.perfis_usuarios profile
set instituicao_id = institution.id
from auth.users auth_user
join public.instituicoes institution
  on institution.id = nullif(auth_user.raw_user_meta_data->>'instituicao_id', '')::uuid
where profile.id = auth_user.id
  and profile.instituicao_id is null
  and auth_user.email = 'douglas.s.sodre@gmail.com'
  and nullif(auth_user.raw_user_meta_data->>'instituicao_id', '') is not null;
