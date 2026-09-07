-- Betel Radar v0.8.2 — acesso autenticado à base operacional
-- Substitui a leitura pública dos anúncios ativos por leitura somente de usuários autenticados.

alter table public.source_listings enable row level security;

-- Remove a policy criada no início da v0.8.2 para o front-end público.
drop policy if exists "public read active listings" on public.source_listings;
drop policy if exists "authenticated read active listings" on public.source_listings;

-- Somente sessões autenticadas podem consultar as oportunidades ativas.
create policy "authenticated read active listings"
on public.source_listings
for select
to authenticated
using (availability_status = 'active');

-- Defesa adicional: o papel anônimo não recebe SELECT direto.
revoke select on table public.source_listings from anon;
grant select on table public.source_listings to authenticated;

comment on policy "authenticated read active listings" on public.source_listings is
  'Betel Radar v0.8.2: anúncios ativos disponíveis somente após login no Betel Cloud.';
