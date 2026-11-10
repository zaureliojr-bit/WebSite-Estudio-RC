-- Execute no SQL Editor do projeto Supabase do Studio RC.
-- Registros privados de dispositivos autorizados pela administradora.
create table if not exists public.studio_push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.studio_push_subscriptions enable row level security;
revoke all on public.studio_push_subscriptions from anon, authenticated;
grant all on public.studio_push_subscriptions to service_role;
-- Não criar políticas públicas: somente o backend autenticado pode registrar ou consultar dispositivos.
