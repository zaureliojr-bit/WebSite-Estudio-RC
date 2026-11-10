-- Execute no SQL Editor do projeto Supabase Studio RC.
-- Armazena somente inscrições de navegadores, não agendamentos.
create table if not exists public.studio_push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.studio_push_subscriptions enable row level security;
revoke all on public.studio_push_subscriptions from anon, authenticated;
grant all on public.studio_push_subscriptions to service_role;
create index if not exists studio_push_subscriptions_updated_at_idx
  on public.studio_push_subscriptions (updated_at desc);
