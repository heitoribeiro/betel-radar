-- Betel Radar v0.8.2 — prospecção assistida e homologação manual
-- Dados de contato ficam separados de source_listings para não serem expostos pela policy pública dos anúncios ativos.

create table if not exists public.listing_prospecting (
  source text not null,
  external_id text not null,
  availability_result text not null default 'unknown' check (availability_result in ('unknown','active','unavailable')),
  availability_checked_at timestamptz,
  contact_name text,
  company text,
  phone text,
  email text,
  profile_type text,
  preferred_channel text,
  contact_source_url text,
  contact_verified_at timestamptz,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source, external_id)
);

alter table public.listing_prospecting enable row level security;
create index if not exists idx_listing_prospecting_availability on public.listing_prospecting(availability_result,availability_checked_at desc);
create index if not exists idx_listing_prospecting_updated on public.listing_prospecting(updated_at desc);

drop trigger if exists trg_listing_prospecting_updated_at on public.listing_prospecting;
create trigger trg_listing_prospecting_updated_at
before update on public.listing_prospecting
for each row execute function public.touch_updated_at();

create or replace function public.radar_get_listing_prospecting(
  p_source text,
  p_external_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public
stable
as $$
declare v_row public.listing_prospecting%rowtype;
begin
  if not public.is_radar_admin() then raise exception 'Acesso não autorizado'; end if;
  select * into v_row
    from public.listing_prospecting
   where source=p_source and external_id=p_external_id;
  if not found then
    return jsonb_build_object(
      'source',p_source,
      'external_id',p_external_id,
      'availability_result','unknown'
    );
  end if;
  return to_jsonb(v_row);
end;
$$;
revoke all on function public.radar_get_listing_prospecting(text,text) from public;
grant execute on function public.radar_get_listing_prospecting(text,text) to authenticated;

create or replace function public.radar_confirm_listing_active(
  p_source text,
  p_external_id text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_listing public.source_listings%rowtype;
  v_row public.listing_prospecting%rowtype;
begin
  if not public.is_radar_admin() then raise exception 'Acesso não autorizado'; end if;
  select * into v_listing from public.source_listings where source=p_source and external_id=p_external_id;
  if not found then raise exception 'Anúncio não encontrado'; end if;

  insert into public.listing_prospecting(
    source,external_id,availability_result,availability_checked_at,notes,updated_by
  ) values (
    p_source,p_external_id,'active',now(),nullif(trim(coalesce(p_note,'')),''),auth.uid()
  )
  on conflict (source,external_id) do update set
    availability_result='active',
    availability_checked_at=now(),
    notes=case when nullif(trim(coalesce(p_note,'')),'') is null then listing_prospecting.notes else excluded.notes end,
    updated_by=auth.uid(),
    updated_at=now()
  returning * into v_row;

  update public.source_listings
     set last_verified_at=now()
   where source=p_source and external_id=p_external_id;

  insert into public.listing_admin_events(user_id,source,external_id,event_type,payload)
  values(auth.uid(),p_source,p_external_id,'restored_active',jsonb_build_object('verification','manual_active_check','note',p_note));

  return to_jsonb(v_row);
end;
$$;
revoke all on function public.radar_confirm_listing_active(text,text,text) from public;
grant execute on function public.radar_confirm_listing_active(text,text,text) to authenticated;

create or replace function public.radar_save_listing_contact(
  p_source text,
  p_external_id text,
  p_contact_name text default null,
  p_company text default null,
  p_phone text default null,
  p_email text default null,
  p_profile_type text default null,
  p_preferred_channel text default null,
  p_contact_source_url text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_listing public.source_listings%rowtype;
  v_row public.listing_prospecting%rowtype;
  v_name text := nullif(trim(coalesce(p_contact_name,'')),'');
  v_company text := nullif(trim(coalesce(p_company,'')),'');
  v_phone text := nullif(trim(coalesce(p_phone,'')),'');
  v_email text := nullif(trim(coalesce(p_email,'')),'');
  v_profile text := nullif(trim(coalesce(p_profile_type,'')),'');
  v_channel text := nullif(trim(coalesce(p_preferred_channel,'')),'');
  v_url text := nullif(trim(coalesce(p_contact_source_url,'')),'');
  v_notes text := nullif(trim(coalesce(p_notes,'')),'');
begin
  if not public.is_radar_admin() then raise exception 'Acesso não autorizado'; end if;
  select * into v_listing from public.source_listings where source=p_source and external_id=p_external_id;
  if not found then raise exception 'Anúncio não encontrado'; end if;
  if v_email is not null and position('@' in v_email)=0 then raise exception 'E-mail inválido'; end if;
  if v_phone is not null and length(v_phone)>40 then raise exception 'Telefone inválido'; end if;
  if v_name is not null and length(v_name)>180 then raise exception 'Nome muito longo'; end if;
  if v_company is not null and length(v_company)>180 then raise exception 'Empresa muito longa'; end if;

  insert into public.listing_prospecting(
    source,external_id,contact_name,company,phone,email,profile_type,preferred_channel,
    contact_source_url,contact_verified_at,notes,updated_by
  ) values (
    p_source,p_external_id,v_name,v_company,v_phone,v_email,v_profile,v_channel,
    coalesce(v_url,v_listing.source_url),
    case when coalesce(v_name,v_company,v_phone,v_email) is null then null else now() end,
    v_notes,auth.uid()
  )
  on conflict (source,external_id) do update set
    contact_name=excluded.contact_name,
    company=excluded.company,
    phone=excluded.phone,
    email=excluded.email,
    profile_type=excluded.profile_type,
    preferred_channel=excluded.preferred_channel,
    contact_source_url=excluded.contact_source_url,
    contact_verified_at=excluded.contact_verified_at,
    notes=excluded.notes,
    updated_by=auth.uid(),
    updated_at=now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;
revoke all on function public.radar_save_listing_contact(text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.radar_save_listing_contact(text,text,text,text,text,text,text,text,text,text) to authenticated;

-- Mantém o histórico de homologação em sincronia quando o usuário confirma indisponibilidade.
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

  insert into public.listing_prospecting(source,external_id,availability_result,availability_checked_at,updated_by)
  values(p_source,p_external_id,'unavailable',now(),auth.uid())
  on conflict (source,external_id) do update set
    availability_result='unavailable',availability_checked_at=now(),updated_by=auth.uid(),updated_at=now();

  insert into public.listing_admin_events(user_id,source,external_id,event_type,payload)
  values(auth.uid(),p_source,p_external_id,'marked_unavailable',jsonb_build_object('reason',p_reason));
  return to_jsonb(v_listing);
end;
$$;
revoke all on function public.radar_mark_listing_unavailable(text,text,text) from public;
grant execute on function public.radar_mark_listing_unavailable(text,text,text) to authenticated;
