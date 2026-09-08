-- Betel Radar v0.8.2 — hardening dos RPCs OAuth OLX

revoke execute on function public.radar_olx_begin_oauth() from anon;
revoke execute on function public.radar_olx_status() from anon;

revoke execute on function public.radar_olx_client_config() from anon, authenticated;
revoke execute on function public.radar_olx_consume_state(text) from anon, authenticated;
revoke execute on function public.radar_olx_store_connection(uuid,text,text,text,text,text,jsonb) from anon, authenticated;

grant execute on function public.radar_olx_begin_oauth() to authenticated;
grant execute on function public.radar_olx_status() to authenticated;

grant execute on function public.radar_olx_client_config() to service_role;
grant execute on function public.radar_olx_consume_state(text) to service_role;
grant execute on function public.radar_olx_store_connection(uuid,text,text,text,text,text,jsonb) to service_role;
