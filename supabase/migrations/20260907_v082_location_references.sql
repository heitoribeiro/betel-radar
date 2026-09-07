create table if not exists public.location_references (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  aliases text[] not null default '{}',
  city text not null,
  state text not null default 'BA',
  country text not null default 'BR',
  latitude numeric not null,
  longitude numeric not null,
  precision text not null default 'neighborhood' check (precision in ('neighborhood','address','exact')),
  source text not null,
  source_ref text,
  verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_name, city, state)
);

alter table public.location_references enable row level security;

create index if not exists idx_location_references_lookup
  on public.location_references(normalized_name, city, state)
  where verified=true;

drop trigger if exists trg_location_references_updated_at on public.location_references;
create trigger trg_location_references_updated_at
before update on public.location_references
for each row execute function public.touch_updated_at();

insert into public.location_references(
  name, normalized_name, aliases, city, state,
  latitude, longitude, precision, source, source_ref, verified
)
values (
  'Areia Branca','areia branca',array['areia'],'Lauro de Freitas','BA',
  -12.84755,-38.3593,'neighborhood','OpenStreetMap','node/2717287237',true
)
on conflict (normalized_name, city, state) do update set
  latitude=excluded.latitude,
  longitude=excluded.longitude,
  source=excluded.source,
  source_ref=excluded.source_ref,
  verified=true,
  updated_at=now();
