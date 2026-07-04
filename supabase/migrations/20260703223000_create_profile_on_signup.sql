alter table public.perfis_usuarios enable row level security;

drop policy if exists "Users can insert own profile" on public.perfis_usuarios;
create policy "Users can insert own profile"
on public.perfis_usuarios
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can view own profile" on public.perfis_usuarios;
create policy "Users can view own profile"
on public.perfis_usuarios
for select
to authenticated
using (auth.uid() = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    nullif(new.raw_user_meta_data->>'instituicao_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'role', 'OPERADOR'),
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'whatsapp',
    coalesce((new.raw_user_meta_data->>'is_active')::boolean, false)
  )
  on conflict (id) do update
  set
    nome = excluded.nome,
    email = excluded.email,
    instituicao_id = excluded.instituicao_id,
    role = excluded.role,
    cpf = excluded.cpf,
    whatsapp = excluded.whatsapp,
    is_active = excluded.is_active;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
