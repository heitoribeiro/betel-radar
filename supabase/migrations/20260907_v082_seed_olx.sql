-- Betel Radar v0.8.2 — seed inicial da fonte OLX autorizada
insert into public.source_configs (source,name,enabled,mode,interval_minutes,params)
select 'olx','OLX Imóveis',false,'authorized_api',60,'{"status":"awaiting_authorized_source","scope":"real_estate"}'::jsonb
where not exists (select 1 from public.source_configs where source='olx');
