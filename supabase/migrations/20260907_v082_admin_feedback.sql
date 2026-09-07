create table if not exists public.radar_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.radar_admin_users enable row level security;

create table if not exists public.listing_admin_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  external_id text not null,
  event_type text not null check (event_type in ('location_corrected','marked_unavailable','restored_active')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.listing_admin_events enable row level security;
create index if not exists idx_listing_admin_events_listing on public.listing_admin_events(source,external_id,created_at desc);

alter table public.source_listings
  add column if not exists manual_availability_lock boolean not null default false,
  add column if not exists manual_unavailable_reason text,
  add column if not exists manual_unavailable_at timestamptz;

alter table public.source_listings drop constraint if exists source_listings_geocode_precision_check;
alter table public.source_listings
  add constraint source_listings_geocode_precision_check
  check (geocode_precision is null or geocode_precision in ('exact','address','neighborhood','city','manual'));

create or replace function public.is_radar_admin()
returns boolean
language sql
security definer
set search_path=public
stable
as $$
  select exists(select 1 from public.radar_admin_users a where a.user_id=auth.uid());
$$;
revoke all on function public.is_radar_admin() from public;
grant execute on function public.is_radar_admin() to authenticated;

create or replace function public.radar_correct_listing_location(
  p_source text,
  p_external_id text,
  p_latitude numeric,
  p_longitude numeric,
  p_note text default null,
  p_save_reference boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_listing public.source_listings%rowtype;
  v_label text;
  v_norm text;
begin
  if not public.is_radar_admin() then raise exception 'Acesso não autorizado'; end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90 then raise exception 'Latitude inválida'; end if;
  if p_longitude is null or p_longitude < -180 or p_longitude > 180 then raise exception 'Longitude inválida'; end if;

  select * into v_listing from public.source_listings where source=p_source and external_id=p_external_id;
  if not found then raise exception 'Anúncio não encontrado'; end if;

  v_label := 'Correção manual Betel Radar';
  if coalesce(v_listing.neighborhood,'')<>'' then v_label := v_label || ' · ' || v_listing.neighborhood; end if;
  if coalesce(v_listing.city,'')<>'' then v_label := v_label || ', ' || v_listing.city; end if;

  update public.source_listings
     set latitude=p_latitude,
         longitude=p_longitude,
         geocode_status='resolved',
         geocode_precision='manual',
         geocode_source='manual',
         geocode_query=coalesce(v_listing.neighborhood||', ','')||coalesce(v_listing.city||', ','')||coalesce(v_listing.state,'BA')||', Brasil',
         geocode_label=v_label,
         geocode_confidence=1,
         geocoded_at=now()
   where source=p_source and external_id=p_external_id
   returning * into v_listing;

  if p_save_reference and coalesce(v_listing.neighborhood,'')<>'' and coalesce(v_listing.city,'')<>'' then
    v_norm := lower(trim(v_listing.neighborhood));
    insert into public.location_references(
      name,normalized_name,aliases,city,state,country,latitude,longitude,precision,source,source_ref,verified
    ) values (
      v_listing.neighborhood,v_norm,array[]::text[],v_listing.city,coalesce(v_listing.state,'BA'),'Brasil',p_latitude,p_longitude,
      'neighborhood','manual_betel',p_source||':'||p_external_id,true
    )
    on conflict (normalized_name,city,state) do update set
      latitude=excluded.latitude,longitude=excluded.longitude,source='manual_betel',source_ref=excluded.source_ref,verified=true,updated_at=now();
  end if;

  insert into public.listing_admin_events(user_id,source,external_id,event_type,payload)
  values(auth.uid(),p_source,p_external_id,'location_corrected',jsonb_build_object('latitude',p_latitude,'longitude',p_longitude,'note',p_note,'saved_reference',p_save_reference));

  return to_jsonb(v_listing);
end;
$$;
revoke all on function public.radar_correct_listing_location(text,text,numeric,numeric,text,boolean) from public;
grant execute on function public.radar_correct_listing_location(text,text,numeric,numeric,text,boolean) to authenticated;

create or replace function public.radar_mark_listing_unavailable(
  p_source text,
  p_external_id text,
  p_reason text default 'confirmado_manualmente'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_listing public.source_listings%rowtype;
begin
  if not public.is_radar_admin() then raise exception 'Acesso não autorizado'; end if;
  update public.source_listings
     set availability_status='unavailable',
         unavailable_at=coalesce(unavailable_at,now()),
         verification_status='stale',
         last_verified_at=now(),
         manual_availability_lock=true,
         manual_unavailable_reason=coalesce(nullif(trim(p_reason),''),'confirmado_manualmente'),
         manual_unavailable_at=now()
   where source=p_source and external_id=p_external_id
   returning * into v_listing;
  if not found then raise exception 'Anúncio não encontrado'; end if;
  insert into public.listing_admin_events(user_id,source,external_id,event_type,payload)
  values(auth.uid(),p_source,p_external_id,'marked_unavailable',jsonb_build_object('reason',p_reason));
  return to_jsonb(v_listing);
end;
$$;
revoke all on function public.radar_mark_listing_unavailable(text,text,text) from public;
grant execute on function public.radar_mark_listing_unavailable(text,text,text) to authenticated;

create or replace function public.radar_restore_listing_active(
  p_source text,
  p_external_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_listing public.source_listings%rowtype;
begin
  if not public.is_radar_admin() then raise exception 'Acesso não autorizado'; end if;
  update public.source_listings
     set availability_status='active',unavailable_at=null,removed_at=null,missing_since=null,consecutive_misses=0,
         verification_status='discovered',manual_availability_lock=false,manual_unavailable_reason=null,manual_unavailable_at=null
   where source=p_source and external_id=p_external_id
   returning * into v_listing;
  if not found then raise exception 'Anúncio não encontrado'; end if;
  insert into public.listing_admin_events(user_id,source,external_id,event_type,payload)
  values(auth.uid(),p_source,p_external_id,'restored_active','{}'::jsonb);
  return to_jsonb(v_listing);
end;
$$;
revoke all on function public.radar_restore_listing_active(text,text) from public;
grant execute on function public.radar_restore_listing_active(text,text) to authenticated;
