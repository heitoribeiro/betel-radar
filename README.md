# Betel Radar

Betel Drones — Radar de Oportunidades.

## Produção

- Versão: v0.8.2
- Hospedagem: GitHub Pages
- URL: https://heitoribeiro.github.io/betel-radar/
- Betel Cloud: Supabase com configuração pública incorporada à versão online

## v0.8.2 — Motor de coleta

A v0.8.2 inicia a infraestrutura para substituir gradualmente os imóveis DEMO por anúncios reais provenientes de fonte autorizada.

- modelo de banco para fontes, anúncios e execuções de sincronização;
- deduplicação por `source + external_id`;
- controle de disponibilidade com estados `active`, `missing`, `unavailable` e `removed`;
- registro de `first_seen_at`, `last_seen_at` e ausências consecutivas;
- camada de sincronização no front-end;
- painel de status com modo DEMO/PRODUÇÃO, última sincronização e contadores;
- contrato de backend preparado para API/feed autorizado da OLX;
- intervalo inicial previsto de 60 minutos.

Arquivos principais:
- `supabase/migrations/20260906_v082_opportunity_sync.sql`
- `v082-sync.js`
- `collector/README.md`

A coleta real permanece desativada até que exista endpoint/API/feed autorizado. O front-end não realiza crawling da OLX.

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
