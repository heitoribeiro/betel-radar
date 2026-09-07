# Betel Radar

Betel Drones — Radar de Oportunidades.

## Produção

- Versão: v0.8.2
- Front-end publicado: build 8207
- Hospedagem: GitHub Pages
- URL: https://heitoribeiro.github.io/betel-radar/
- Betel Cloud: Supabase de produção ativo
- Fonte principal da interface: oportunidades reais descobertas na web

## v0.8.2 — Motor de coleta e descoberta

A v0.8.2 substituiu os imóveis fictícios da operação corrente por oportunidades reais/prováveis encontradas na Internet. Enquanto a API oficial da OLX não é disponibilizada/autorizada, o Betel Radar usa uma camada auxiliar de descoberta via Brave Search e resultados indexados de portais imobiliários, sem crawling direto da OLX.

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
- persistência via Supabase REST usando chave secreta somente no backend;
- adaptador `collector/adapters/brave-search.js` para descobrir URLs diretas da OLX e Viva Real através da Brave Search API;
- executor `collector/run-discovery.js` para reconciliar e gravar a descoberta web;
- workflow `.github/workflows/web-discovery.yml` ativo para três execuções diárias;
- primeira coleta automatizada homologada com sucesso: 8 consultas, 4 resultados diretos, sendo 2 OLX e 2 Viva Real;
- parser de preço/área testado e corrigido;
- 14 oportunidades ativas no Betel Cloud nesta etapa, sendo 10 sementes de pesquisa web e 4 coletadas automaticamente pelo Brave;
- build 8207 força o uso da fonte real em PRODUÇÃO e remove o retorno ao modo DEMO da interface operacional;
- `radar_user_state` foi substituído pelos 14 registros reais/prováveis, todos iniciando no CRM como `Novo`;
- camada `v082-real-data.js` adapta os anúncios reais ao formato legado da aplicação e preserva campos comerciais editados pelo usuário entre sincronizações;
- configuração oficial `OLX Imóveis` permanece desativada aguardando API/feed/endpoint autorizado.

### Fontes atuais

1. **OLX oficial** — preparada, porém desativada até existir mecanismo autorizado.
2. **Brave Search Discovery** — ativa para encontrar páginas indexadas da OLX e Viva Real sem acessar/crawlear diretamente esses portais.
3. **Viva Real** — segunda origem de oportunidades descobertas pelo índice web.

Anúncios encontrados por índice web recebem `verification_status=discovered`. Isso significa oportunidade provável e não confirmação oficial de disponibilidade pelo portal de origem.

## Automação Brave Search

Os secrets do GitHub Actions foram configurados e a primeira execução foi homologada com sucesso. O workflow principal roda três vezes por dia.

Secrets usados pelo backend:

- `BETEL_WEB_DISCOVERY_ENABLED=true`
- `BRAVE_SEARCH_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` legado

Política padrão da descoberta web:

- 3 ciclos/dia;
- OLX + Viva Real;
- grupos de busca para Lauro de Freitas, Camaçari, Mata de São João e Simões Filho/Dias d'Ávila/Pojuca;
- foco em terreno, lote, sítio, chácara e fazenda;
- até 6 ausências de índice antes de `unavailable`;
- 14 dias após indisponibilidade antes de `removed`.

Nunca versionar `BRAVE_SEARCH_API_KEY`, `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` no repositório.

## Arquivos principais

- `supabase/migrations/20260906_v082_opportunity_sync.sql`
- `supabase/migrations/20260907_v082_hardening.sql`
- `supabase/migrations/20260907_v082_web_discovery.sql`
- `v082-sync.js`
- `v082-real-data.js`
- `collector/sync-engine.js`
- `collector/supabase-rest.js`
- `collector/run-sync.js`
- `collector/run-discovery.js`
- `collector/adapters/brave-search.js`
- `collector/brave-search.test.js`
- `collector/sync-engine.test.js`
- `.github/workflows/betel-sync.yml`
- `.github/workflows/web-discovery.yml`

## Próximos passos

1. validar no Dashboard, Radar, Radar Visual e CRM a substituição completa dos dados fictícios pelos anúncios reais;
2. melhorar a ficha de cada oportunidade com identificação da fonte e acesso rápido ao anúncio original;
3. iniciar enriquecimento manual/assistido de anunciante e canais de contato para prospecção dos serviços de filmagem aérea;
4. acompanhar as próximas execuções do Brave e validar deduplicação/atualizações;
5. continuar aguardando o mecanismo oficial autorizado da OLX;
6. quando a OLX liberar o acesso, habilitar também o coletor oficial e promover anúncios confirmados para `verified`.

## Segurança e conformidade

- o front-end usa somente a publishable key do Supabase;
- chaves secretas e chaves de busca ficam exclusivamente no backend/GitHub Secrets;
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
