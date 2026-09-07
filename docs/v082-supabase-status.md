# Betel Radar v0.8.2 — estado do Supabase

Projeto: `Betel-Radar`
Região: `sa-east-1`
Status: ativo e saudável.

## Aplicado em produção

- migration principal `v082_opportunity_sync`;
- tabelas `source_configs`, `source_listings` e `sync_runs`;
- índices de status, cidade e `last_seen_at`;
- triggers de `updated_at`;
- RLS habilitado;
- policy pública apenas para leitura de anúncios `active`;
- hardening de `touch_updated_at()` com `search_path=public`;
- otimização das policies de `radar_user_state` com `(select auth.uid())`;
- fonte `OLX Imóveis` criada em `authorized_api`, intervalo 60 min e `enabled=false`.

## Estado operacional

A fonte OLX permanece desativada até existir mecanismo oficialmente autorizado. O backend horário também permanece desativado até configuração dos secrets e homologação da primeira execução.

## Advisors

- avisos de performance sobre índices novos não utilizados são esperados enquanto `source_listings` estiver sem carga real;
- `source_configs` e `sync_runs` possuem RLS sem policy pública por intenção: somente o backend/service role deverá acessar essas tabelas;
- há recomendação do Supabase Auth para habilitar proteção contra senhas vazadas antes de ampliar o uso do sistema.
