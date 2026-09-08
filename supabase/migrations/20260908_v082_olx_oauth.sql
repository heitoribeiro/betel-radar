-- Betel Radar v0.8.2 — integração OAuth oficial OLX
-- Credenciais da aplicação NÃO ficam neste arquivo. São armazenadas no Supabase Vault.

create table if not exists public.olx_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  requested_by uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'basic_user_info autoupload',
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used_at timestamptz
);

create index if not exists idx_olx_oauth_states_expiry
  on public.olx_oauth_states(expires_at desc);

alter table public.olx_oauth_states enable row level security;
revoke all on public.olx_oauth_states from anon, authenticated;

create table if not exists public.olx_connections (
  id uuid primary key default gen_random_uuid(),
  authorized_by uuid references auth.users(id) on delete set null,
  olx_user_name text,
  olx_user_email text,
  access_token_secret_id uuid not null,
  token_type text not null default 'Bearer',
  scope text not null,
  status text not null default 'active' check (status in ('active','revoked','error')),
  connected_at timestamptz not null default now(),
  last_validated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_olx_connections_status
  on public.olx_connections(status, updated_at desc);
create index if not exists idx_olx_connections_email
  on public.olx_connections(lower(olx_user_email));

alter table public.olx_connections enable row level security;
revoke all on public.olx_connections from anon, authenticated;

drop trigger if exists trg_olx_connections_updated_at on public.olx_connections;
create trigger trg_olx_connections_updated_at
before update on public.olx_connections
for each row execute function public.touch_updated_at();

create or replace function public.radar_olx_begin_oauth()
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,vault
as $$
declare
  v_state text;
  v_scope text := 'basic_user_info autoupload';
begin
  if not public.is_radar_admin() then
    raise exception 'Acesso não autorizado';
  end if;

  v_state := encode(gen_random_bytes(32),'hex');

  insert into public.olx_oauth_states(state_hash,requested_by,scope)
  values (encode(digest(v_state,'sha256'),'hex'),auth.uid(),v_scope);

  delete from public.olx_oauth_states
   where expires_at < now() - interval '1 day';

  return jsonb_build_object('state',v_state,'scope',v_scope);
end;
$$;
revoke all on function public.radar_olx_begin_oauth() from public;
grant execute on function public.radar_olx_begin_oauth() to authenticated;

create or replace function public.radar_olx_consume_state(p_state text)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_requested_by uuid;
  v_scope text;
begin
  if nullif(trim(coalesce(p_state,'')),'') is null then
    raise exception 'Estado OAuth ausente';
  end if;

  update public.olx_oauth_states
     set used_at=now()
   where state_hash=encode(digest(p_state,'sha256'),'hex')
     and used_at is null
     and expires_at > now()
  returning requested_by,scope into v_requested_by,v_scope;

  if not found then
    raise exception 'Estado OAuth inválido, expirado ou já utilizado';
  end if;

  return jsonb_build_object('requested_by',v_requested_by,'scope',v_scope);
end;
$$;
revoke all on function public.radar_olx_consume_state(text) from public;
grant execute on function public.radar_olx_consume_state(text) to service_role;

create or replace function public.radar_olx_client_config()
returns jsonb
language plpgsql
security definer
set search_path=public,vault
as $$
declare
  v_client_id text;
  v_client_secret text;
begin
  select decrypted_secret into v_client_id
    from vault.decrypted_secrets
   where name='betel_olx_client_id'
   order by updated_at desc
   limit 1;

  select decrypted_secret into v_client_secret
    from vault.decrypted_secrets
   where name='betel_olx_client_secret'
   order by updated_at desc
   limit 1;

  if v_client_id is null or v_client_secret is null then
    raise exception 'Credenciais OLX não configuradas no Vault';
  end if;

  return jsonb_build_object(
    'client_id',v_client_id,
    'client_secret',v_client_secret,
    'redirect_uri','https://asnjlaxhbehzhisandmz.supabase.co/functions/v1/olx-oauth-callback'
  );
end;
$$;
revoke all on function public.radar_olx_client_config() from public;
grant execute on function public.radar_olx_client_config() to service_role;

create or replace function public.radar_olx_store_connection(
  p_authorized_by uuid,
  p_access_token text,
  p_token_type text,
  p_scope text,
  p_olx_user_name text default null,
  p_olx_user_email text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,vault
as $$
declare
  v_connection_id uuid;
  v_secret_id uuid;
  v_secret_name text;
  v_existing public.olx_connections%rowtype;
begin
  if nullif(trim(coalesce(p_access_token,'')),'') is null then
    raise exception 'Access token OLX ausente';
  end if;

  if nullif(trim(coalesce(p_olx_user_email,'')),'') is not null then
    select * into v_existing
      from public.olx_connections
     where lower(olx_user_email)=lower(trim(p_olx_user_email))
     order by updated_at desc
     limit 1;
  end if;

  if found then
    perform vault.update_secret(
      v_existing.access_token_secret_id,
      p_access_token,
      null,
      'Token OAuth OLX atualizado pelo Betel Radar',
      null
    );

    update public.olx_connections
       set authorized_by=p_authorized_by,
           olx_user_name=nullif(trim(coalesce(p_olx_user_name,'')),''),
           olx_user_email=nullif(trim(coalesce(p_olx_user_email,'')),''),
           token_type=coalesce(nullif(trim(p_token_type),''),'Bearer'),
           scope=coalesce(nullif(trim(p_scope),''),'basic_user_info autoupload'),
           status='active',
           connected_at=now(),
           last_validated_at=now(),
           metadata=coalesce(p_metadata,'{}'::jsonb)
     where id=v_existing.id
    returning id into v_connection_id;
  else
    v_secret_name := 'betel_olx_access_token_' || gen_random_uuid()::text;
    v_secret_id := vault.create_secret(
      p_access_token,
      v_secret_name,
      'Access token OAuth OLX de cliente conectado ao Betel Radar',
      null
    );

    insert into public.olx_connections(
      authorized_by,olx_user_name,olx_user_email,access_token_secret_id,
      token_type,scope,status,last_validated_at,metadata
    ) values (
      p_authorized_by,
      nullif(trim(coalesce(p_olx_user_name,'')),''),
      nullif(trim(coalesce(p_olx_user_email,'')),''),
      v_secret_id,
      coalesce(nullif(trim(p_token_type),''),'Bearer'),
      coalesce(nullif(trim(p_scope),''),'basic_user_info autoupload'),
      'active',now(),coalesce(p_metadata,'{}'::jsonb)
    ) returning id into v_connection_id;
  end if;

  return v_connection_id;
end;
$$;
revoke all on function public.radar_olx_store_connection(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.radar_olx_store_connection(uuid,text,text,text,text,text,jsonb) to service_role;

create or replace function public.radar_olx_status()
returns table (
  id uuid,
  olx_user_name text,
  olx_user_email text,
  token_type text,
  scope text,
  status text,
  connected_at timestamptz,
  last_validated_at timestamptz,
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
  select c.id,c.olx_user_name,c.olx_user_email,c.token_type,c.scope,c.status,
         c.connected_at,c.last_validated_at,c.updated_at
    from public.olx_connections c
   order by c.updated_at desc;
end;
$$;
revoke all on function public.radar_olx_status() from public;
grant execute on function public.radar_olx_status() to authenticated;
