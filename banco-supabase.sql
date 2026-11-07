-- Studio Raquel Cândida. Execute uma vez em um projeto novo do Supabase, no SQL Editor.
-- Tabelas sem políticas públicas: somente as funções da Netlify com chave de servidor acessam.
create table if not exists public.studio_settings (
  id text primary key,
  data jsonb not null
);
create table if not exists public.studio_bookings (
  id uuid primary key,
  slot text unique,
  data jsonb not null
);
alter table public.studio_settings enable row level security;
alter table public.studio_bookings enable row level security;
revoke all on public.studio_settings from anon, authenticated;
revoke all on public.studio_bookings from anon, authenticated;
grant all on public.studio_settings to service_role;
grant all on public.studio_bookings to service_role;
-- Uma transação libera a reserva anterior e cria a nova. Conflito desfaz tudo.
create or replace function public.studio_reschedule(old_id uuid, new_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare old_data jsonb;
begin
  select data into old_data from public.studio_bookings where id=old_id for update;
  if old_data is null or old_data->>'status'='cancelled' then
    raise exception 'Agendamento original indisponível';
  end if;
  update public.studio_bookings set slot=null,
    data=jsonb_set(jsonb_set(old_data,'{status}','"cancelled"'::jsonb),'{slot}','null'::jsonb)
    where id=old_id;
  insert into public.studio_bookings(id,slot,data)
    values ((new_data->>'id')::uuid,new_data->>'slot',new_data);
end;
$$;
revoke all on function public.studio_reschedule(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.studio_reschedule(uuid,jsonb) to service_role;
-- Comprovantes privados. Nenhuma política de leitura pública deve ser criada.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('studio-receipts','studio-receipts',false,3145728,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do nothing;
