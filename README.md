# Betel Radar

Betel Drones — Radar de Oportunidades.

## Produção

- Versão: v0.8.2
- Front-end publicado: build 8206
- Hospedagem: GitHub Pages
- URL: https://heitoribeiro.github.io/betel-radar/
- Betel Cloud: Supabase de produção ativo e preparado para o motor de coleta

## v0.8.2 — Motor de coleta e descoberta

A v0.8.2 está substituindo gradualmente os imóveis DEMO por oportunidades reais. Enquanto a API oficial da OLX não é disponibilizada/autorizada, o Betel Radar usa uma camada auxiliar de descoberta via índice de busca, sem crawling direto da OLX.

Já implementado no repositório e no Supabase:

- modelo de banco para fontes, anúncios e execuções de sincronização;
- migrations aplicadas no Supabase de produção;
- tabelas `source_configs`, `source_listings` e `sync_runs` validadas;
- deduplicação por `source + external_id`;
- controle de disponibilidade com estados `active`, `missing`, `unavailable` e `removed`;
- campos de descoberta `discovered_via`, `verification_status`, `discovery_query`, `discovered_at`, `last_verified_at` e `source_rank`;
- distinção entre `discovered`, `verified`, `stale` e `rejected`;
- motor de reconciliação independente da fonte;
- política específica para índices web, mantendo a oportunidade ativa por múltiplas ausências antes de marcá-la como indisponível;
- persistência via Supabase REST usando service role somente no backend;
- adaptador `collector/adapters/brave-search.js` para descobrir URLs diretas da OLX e Viva Real através do Brave Search API;
- executor `collector/run-discovery.js` para reconciliar e gravar a descoberta web;
- workflow `.github/workflows/web-discovery.yml` preparado para três execuções diárias;
- testes automatizados e CI do coletor aprovados;
- 10 oportunidades iniciais reais/prováveis de OLX e Viva Real já cadastradas no Betel Cloud como `discovered`;
- front-end build 8206 conectado ao `source_listings` do Betel Cloud no modo PRODUÇÃO;
- modo DEMO preservado como fallback;
- configuração oficial `OLX Imóveis` mantida desativada aguardando API/feed/endpoint autorizado.

### Fontes atuais

1. **OLX oficial** — preparada, porém desativada até existir mecanismo autorizado.
2. **Brave Search Discovery** — adaptador preparado para encontrar páginas indexadas da OLX e Viva Real sem acessar/crawlear diretamente esses portais.
3. **Viva Real** — usado como segunda origem de oportunidades descobertas pelo índice web.

Anúncios encontrados por índice web recebem `verification_status=discovered`. Isso significa oportunidade provável e não confirmação oficial de disponibilidade pelo portal de origem.

## Automação Brave Search

O workflow está preparado, mas permanece inativo até a configuração dos secrets do GitHub Actions:

- `BETEL_WEB_DISCOVERY_ENABLED=true`
- `BRAVE_SEARCH_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Política padrão da descoberta web:

- 3 ciclos/dia;
- OLX + Viva Real;
- grupos de busca para Lauro de Freitas, Camaçari, Mata de São João e Simões Filho/Dias d'Ávila/Pojuca;
- foco em terreno, lote, sítio, chácara e fazenda;
- até 6 ausências de índice antes de `unavailable`;
- 14 dias após indisponibilidade antes de `removed`.

Nunca versionar `BRAVE_SEARCH_API_KEY` nem `SUPABASE_SERVICE_ROLE_KEY` no repositório.

## Arquivos principais

- `supabase/migrations/20260906_v082_opportunity_sync.sql`
- `supabase/migrations/20260907_v082_hardening.sql`
- `supabase/migrations/20260907_v082_web_discovery.sql`
- `v082-sync.js`
- `collector/sync-engine.js`
- `collector/supabase-rest.js`
- `collector/run-sync.js`
- `collector/run-discovery.js`
- `collector/adapters/brave-search.js`
- `collector/sync-engine.test.js`
- `.github/workflows/betel-sync.yml`
- `.github/workflows/web-discovery.yml`

## Próximos passos

1. criar/obter a chave da Brave Search API;
2. cadastrar os secrets no GitHub Actions sem expor as credenciais;
3. habilitar `BETEL_WEB_DISCOVERY_ENABLED=true` e homologar a primeira coleta automatizada;
4. validar os novos anúncios no Radar e o acesso às páginas de origem para prospecção assistida;
5. continuar aguardando o mecanismo oficial autorizado da OLX;
6. quando a OLX liberar o acesso, habilitar também o coletor oficial e promover os anúncios confirmados para `verified`.

## Segurança e conformidade

- o front-end usa somente a publishable key do Supabase;
- service role e chaves de busca ficam exclusivamente no backend/GitHub Secrets;
- RLS permite leitura pública somente de anúncios ativos;
- `source_configs` e `sync_runs` permanecem fechados para clientes públicos;
- não há disparo automático no chat da OLX;
- o Betel Radar não executa crawling/scraping direto da OLX;
- a futura integração oficial da OLX deverá usar somente mecanismo expressamente autorizado.

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
