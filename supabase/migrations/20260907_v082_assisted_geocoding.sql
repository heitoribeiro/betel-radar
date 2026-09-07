alter table public.source_listings
  add column if not exists geocode_status text,
  add column if not exists geocode_precision text,
  add column if not exists geocode_source text,
  add column if not exists geocode_query text,
  add column if not exists geocode_label text,
  add column if not exists geocode_confidence numeric,
  add column if not exists geocoded_at timestamptz,
  add column if not exists location_signature text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname='source_listings_geocode_status_check'
  ) then
    alter table public.source_listings
      add constraint source_listings_geocode_status_check
      check (geocode_status is null or geocode_status in ('resolved','unresolved'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname='source_listings_geocode_precision_check'
  ) then
    alter table public.source_listings
      add constraint source_listings_geocode_precision_check
      check (geocode_precision is null or geocode_precision in ('exact','address','neighborhood','city'));
  end if;
end $$;

create index if not exists idx_source_listings_geocode_status on public.source_listings(geocode_status);
create index if not exists idx_source_listings_location_signature on public.source_listings(location_signature);
