-- Betel Radar v0.8.2 — central de contatos/prospecção
-- Expõe somente a usuários autenticados administradores uma visão consolidada
-- dos contatos registrados manualmente em listing_prospecting.

create or replace function public.radar_list_prospect_contacts()
returns table (
  listing_id uuid,
  source text,
  external_id text,
  listing_title text,
  city text,
  advertiser text,
  source_url text,
  availability_result text,
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
  updated_at timestamptz
)
language plpgsql
security definer
set search_path=public
stable
as $$
begin
  if not public.is_radar_admin() then
    raise exception 'Acesso não autorizado';
  end if;

  return query
  select
    s.id as listing_id,
    p.source,
    p.external_id,
    s.title as listing_title,
    s.city,
    s.advertiser,
    s.source_url,
    p.availability_result,
    p.availability_checked_at,
    p.contact_name,
    p.company,
    p.phone,
    p.email,
    p.profile_type,
    p.preferred_channel,
    p.contact_source_url,
    p.contact_verified_at,
    p.notes,
    p.updated_at
  from public.listing_prospecting p
  left join public.source_listings s
    on s.source=p.source and s.external_id=p.external_id
  order by
    case when coalesce(p.contact_name,p.company,p.phone,p.email) is null then 1 else 0 end,
    p.contact_verified_at desc nulls last,
    p.updated_at desc;
end;
$$;

revoke all on function public.radar_list_prospect_contacts() from public;
grant execute on function public.radar_list_prospect_contacts() to authenticated;
