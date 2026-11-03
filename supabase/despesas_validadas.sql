-- Despesas iguais (mesmo carro, data e valor) que o usuário conferiu e decidiu manter.
-- Rodar UMA vez no Supabase: SQL Editor → New query → colar → Run.
-- É só um acréscimo: não altera nem apaga nenhuma tabela existente.
-- Para desfazer: drop table public.despesas_validadas;

create table if not exists public.despesas_validadas (
  assinatura text primary key,           -- ids das despesas do grupo, em ordem, ex.: "812-813"
  validado_em timestamptz not null default now()
);

alter table public.despesas_validadas enable row level security;
drop policy if exists "sistema_acesso_total" on public.despesas_validadas;
create policy "sistema_acesso_total" on public.despesas_validadas
  for all to anon, authenticated using (true) with check (true);
