# Betel Radar

Betel Drones — Radar de Oportunidades.

## Produção

- Versão: v0.8.2
- Front-end publicado: build 8205
- Hospedagem: GitHub Pages
- URL: https://heitoribeiro.github.io/betel-radar/
- Betel Cloud: Supabase com configuração pública incorporada à versão online

## v0.8.2 — Motor de coleta

A v0.8.2 prepara a substituição gradual dos imóveis DEMO por anúncios reais provenientes de fonte autorizada.

Já implementado no repositório:

- modelo de banco para fontes, anúncios e execuções de sincronização;
- deduplicação por `source + external_id`;
- controle de disponibilidade com estados `active`, `missing`, `unavailable` e `removed`;
- registro de `first_seen_at`, `last_seen_at` e ausências consecutivas;
- motor de reconciliação independente da fonte;
- persistência preparada via Supabase REST usando service role somente no backend;
- testes automatizados da política de disponibilidade;
- workflow GitHub Actions preparado para execução horária;
- camada de sincronização no front-end;
- painel de status com modo DEMO/PRODUÇÃO;
- contrato preparado para API/feed/endpoint autorizado da OLX.

Arquivos principais:

- `supabase/migrations/20260906_v082_opportunity_sync.sql`
- `v082-sync.js`
- `collector/sync-engine.js`
- `collector/supabase-rest.js`
- `collector/run-sync.js`
- `collector/sync-engine.test.js`
- `.github/workflows/betel-sync.yml`

A coleta real permanece desativada até que a migration esteja aplicada no Supabase, os secrets do backend estejam configurados e exista endpoint/API/feed autorizado. O front-end não realiza crawling da OLX.

## Próximos passos para PRODUÇÃO

1. aplicar `supabase/migrations/20260906_v082_opportunity_sync.sql` no projeto Supabase;
2. aguardar/obter o mecanismo autorizado da OLX;
3. configurar os secrets do workflow;
4. homologar uma execução manual;
5. habilitar o ciclo horário com `BETEL_SYNC_ENABLED=true`;
6. após validar os anúncios reais, mudar o Radar de DEMO para PRODUÇÃO.

## Principais melhorias

### v0.8.1
- Agenda com resumo de Hoje, próximos 7 dias e follow-ups atrasados
- Exportação da Agenda em CSV
- Financeiro com busca rápida e exportação CSV
- Acesso à ficha da oportunidade diretamente pelas linhas do Financeiro
- Contador de caracteres no gerador de Mensagens IA

### v0.8.0
- CRM com 8 etapas, incluindo Analisado
- Mapa real com OpenStreetMap/Leaflet
- Marcadores de Score Betel com maior contraste
- Correções específicas para navegação mobile, incluindo recorte parcial do mapa sob o menu lateral
- Ajustes de desempenho e estabilidade

## Conformidade

O fluxo permanece assistido: sem disparo automático no chat da OLX e sem automação que viole os termos das fontes utilizadas. A integração de dados da OLX deverá usar somente mecanismo oficialmente autorizado.
