alter table public.instituicoes enable row level security;
alter table public.perfis_usuarios enable row level security;

create or replace function public.is_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis_usuarios
    where id = check_user_id
      and role = 'SUPER_ADMIN'
      and coalesce(is_active, true) = true
  );
$$;

grant execute on function public.is_super_admin(uuid) to authenticated;

drop policy if exists "Super admins can view all institutions" on public.instituicoes;
create policy "Super admins can view all institutions"
on public.instituicoes
for select
to authenticated
using (public.is_super_admin());

drop policy if exists "Super admins can update all institutions" on public.instituicoes;
create policy "Super admins can update all institutions"
on public.instituicoes
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Super admins can view all profiles" on public.perfis_usuarios;
create policy "Super admins can view all profiles"
on public.perfis_usuarios
for select
to authenticated
using (public.is_super_admin());

drop policy if exists "Super admins can update all profiles" on public.perfis_usuarios;
create policy "Super admins can update all profiles"
on public.perfis_usuarios
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());
