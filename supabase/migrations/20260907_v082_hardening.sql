-- Betel Radar v0.8.2 — hardening pós-migration

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists radar_state_select_own on public.radar_user_state;
create policy radar_state_select_own on public.radar_user_state
for select using ((select auth.uid()) = user_id);

drop policy if exists radar_state_insert_own on public.radar_user_state;
create policy radar_state_insert_own on public.radar_user_state
for insert with check ((select auth.uid()) = user_id);

drop policy if exists radar_state_update_own on public.radar_user_state;
create policy radar_state_update_own on public.radar_user_state
for update using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists radar_state_delete_own on public.radar_user_state;
create policy radar_state_delete_own on public.radar_user_state
for delete using ((select auth.uid()) = user_id);

insert into public.source_configs (source,name,enabled,mode,interval_minutes,params)
select 'olx','OLX Imóveis',false,'authorized_api',60,'{"status":"awaiting_authorized_source","scope":"real_estate"}'::jsonb
where not exists (select 1 from public.source_configs where source='olx');
