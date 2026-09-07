-- Betel Radar v0.8.2 — descoberta web via índice de busca

alter table public.source_configs drop constraint if exists source_configs_mode_check;
alter table public.source_configs add constraint source_configs_mode_check
  check (mode in ('authorized_api','feed','manual_import','web_search'));

alter table public.source_listings add column if not exists discovered_via text not null default 'authorized_source';
alter table public.source_listings add column if not exists verification_status text not null default 'verified'
  check (verification_status in ('discovered','verified','stale','rejected'));
alter table public.source_listings add column if not exists discovery_query text;
alter table public.source_listings add column if not exists discovered_at timestamptz not null default now();
alter table public.source_listings add column if not exists last_verified_at timestamptz;
alter table public.source_listings add column if not exists source_rank integer;

create index if not exists idx_source_listings_verification on public.source_listings(verification_status);
create index if not exists idx_source_listings_discovered_via on public.source_listings(discovered_via);

insert into public.source_configs (source,name,enabled,mode,interval_minutes,params)
select 'brave_search','Brave Search — OLX + Viva Real',false,'web_search',480,
  '{"targets":["olx.com.br","vivareal.com.br"],"cities":["Lauro de Freitas","Camaçari","Mata de São João","Simões Filho / Dias d''Ávila / Pojuca"],"terms":["terreno","lote","sítio","chácara","fazenda"],"status":"awaiting_api_key"}'::jsonb
where not exists (select 1 from public.source_configs where source='brave_search');
