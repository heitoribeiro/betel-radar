-- Betel Radar v0.8.2 — overrides administrativos de dados capturados
-- Mantém o dado bruto da fonte e aplica correções manuais separadamente.

alter table public.source_listings
  add column if not exists manual_price numeric,
  add column if not exists manual_area_m2 numeric,
  add column if not exists manual_advertiser text,
  add column if not exists manual_data_note text,
  add column if not exists manual_data_updated_at timestamptz,
  add column if not exists manual_data_updated_by uuid references auth.users(id) on delete set null;

alter table public.listing_admin_events
  drop constraint if exists listing_admin_events_event_type_check;

alter table public.listing_admin_events
  add constraint listing_admin_events_event_type_check
  check (event_type in ('location_corrected','marked_unavailable','restored_active','data_corrected'));

create or replace function public.radar_correct_listing_data(
  p_source text,
  p_external_id text,
  p_override_price boolean default false,
  p_price numeric default null,
  p_override_area boolean default false,
  p_area_m2 numeric default null,
  p_override_advertiser boolean default false,
  p_advertiser text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_listing public.source_listings%rowtype;
begin
  if not public.is_radar_admin() then
    raise exception 'Acesso não autorizado';
  end if;

  if p_override_price and (p_price is null or p_price < 0) then
    raise exception 'Preço inválido';
  end if;

  if p_override_area and (p_area_m2 is null or p_area_m2 <= 0) then
    raise exception 'Área inválida';
  end if;

  if p_override_advertiser and coalesce(nullif(trim(p_advertiser),''),'') = '' then
    raise exception 'Anunciante inválido';
  end if;

  update public.source_listings
     set manual_price = case when p_override_price then p_price else null end,
         manual_area_m2 = case when p_override_area then p_area_m2 else null end,
         manual_advertiser = case when p_override_advertiser then trim(p_advertiser) else null end,
         manual_data_note = nullif(trim(coalesce(p_note,'')),''),
         manual_data_updated_at = now(),
         manual_data_updated_by = auth.uid()
   where source = p_source
     and external_id = p_external_id
   returning * into v_listing;

  if not found then
    raise exception 'Anúncio não encontrado';
  end if;

  insert into public.listing_admin_events(user_id,source,external_id,event_type,payload)
  values(
    auth.uid(),
    p_source,
    p_external_id,
    'data_corrected',
    jsonb_build_object(
      'override_price',p_override_price,
      'price',case when p_override_price then p_price else null end,
      'override_area',p_override_area,
      'area_m2',case when p_override_area then p_area_m2 else null end,
      'override_advertiser',p_override_advertiser,
      'advertiser',case when p_override_advertiser then trim(p_advertiser) else null end,
      'note',nullif(trim(coalesce(p_note,'')),'')
    )
  );

  return to_jsonb(v_listing);
end;
$$;

revoke all on function public.radar_correct_listing_data(text,text,boolean,numeric,boolean,numeric,boolean,text,text) from public;
grant execute on function public.radar_correct_listing_data(text,text,boolean,numeric,boolean,numeric,boolean,text,text) to authenticated;
