-- Betel Radar v0.8.2 — estrutura de coleta/sincronização
-- Aplicar no Supabase SQL Editor ou via migrations.

create extension if not exists pgcrypto;

create table if not exists public.source_configs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'olx',
  name text not null,
  enabled boolean not null default false,
  mode text not null default 'authorized_api' check (mode in ('authorized_api','feed','manual_import')),
  interval_minutes integer not null default 60 check (interval_minutes >= 15),
  endpoint_url text,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_listings (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  source_url text,
  title text not null,
  description text,
  advertiser text,
  advertiser_type text,
  listing_type text,
  property_type text,
  price numeric,
  condominium_fee numeric,
  iptu numeric,
  city text,
  state text,
  neighborhood text,
  address_text text,
  latitude numeric,
  longitude numeric,
  bedrooms integer,
  bathrooms integer,
  parking_spaces integer,
  area_m2 numeric,
  image_urls jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  availability_status text not null default 'active' check (availability_status in ('active','missing','unavailable','removed')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  missing_since timestamptz,
  unavailable_at timestamptz,
  removed_at timestamptz,
  consecutive_misses integer not null default 0,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, external_id)
);

create index if not exists idx_source_listings_status on public.source_listings(availability_status);
create index if not exists idx_source_listings_last_seen on public.source_listings(last_seen_at desc);
create index if not exists idx_source_listings_city on public.source_listings(city);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','partial','error')),
  found_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  missing_count integer not null default 0,
  unavailable_count integer not null default 0,
  removed_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_source_configs_updated_at on public.source_configs;
create trigger trg_source_configs_updated_at before update on public.source_configs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_source_listings_updated_at on public.source_listings;
create trigger trg_source_listings_updated_at before update on public.source_listings
for each row execute function public.touch_updated_at();

-- Regra inicial de disponibilidade:
-- 1ª ausência: missing
-- 2ª ausência consecutiva: unavailable
-- após política definida pelo backend (ex.: 7 dias): removed

alter table public.source_configs enable row level security;
alter table public.source_listings enable row level security;
alter table public.sync_runs enable row level security;

-- Leitura pública apenas dos anúncios ativos para o front-end do GitHub Pages.
-- Ajustar quando a autenticação de usuário for consolidada.
drop policy if exists "public read active listings" on public.source_listings;
create policy "public read active listings"
on public.source_listings for select
using (availability_status = 'active');

-- Não são criadas policies públicas de INSERT/UPDATE/DELETE.
-- Escritas deverão ocorrer somente pelo backend autorizado usando service role.
