# Betel Radar

Betel Drones — Radar de Oportunidades.

## Produção

- Versão: v0.8.2
- Front-end publicado: build 8210
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
- 14 oportunidades reais/prováveis ativas no Betel Cloud nesta etapa;
- build 8207 passou a forçar o uso da fonte real em PRODUÇÃO e removeu o retorno ao modo DEMO da interface operacional;
- camada `v082-real-data.js` adapta os anúncios reais ao formato legado da aplicação e preserva campos comerciais editados pelo usuário entre sincronizações;
- build 8208 adicionou origem, método de descoberta, status de verificação, acesso ao anúncio original e checklist antes da abordagem;
- build 8209 estabilizou a ficha no Radar Visual/mobile e removeu observadores globais de DOM que provocavam renderizações repetidas;
- build 8210 implementa georreferenciamento assistido com OpenStreetMap/Nominatim e metadados de precisão (`exact`, `address`, `neighborhood`, `city`);
- os 14 anúncios ativos foram geocodificados: 7 por bairro/localidade e 7 por município;
- o mapa agrupa oportunidades que compartilham a mesma referência geográfica, mostra Score, preço/área, origem e nível de precisão sem apresentar uma posição aproximada como exata;
- a ficha da oportunidade passa a informar explicitamente a precisão da localização usada no mapa;
- cada descoberta web executa o geocodificador após a reconciliação; mudanças em endereço/bairro/cidade alteram `location_signature` e provocam nova geocodificação;
- o front-end verifica o Betel Cloud de forma leve enquanto está aberto, sem reintroduzir observadores globais de DOM;
- indicadores visuais não confirmados são tratados como `não verificado`;
- configuração oficial `OLX Imóveis` permanece desativada aguardando API/feed/endpoint autorizado.

### Fontes atuais

1. **OLX oficial** — preparada, porém desativada até existir mecanismo autorizado.
2. **Brave Search Discovery** — ativa para encontrar páginas indexadas da OLX e Viva Real sem acessar/crawlear diretamente esses portais.
3. **Viva Real** — segunda origem de oportunidades descobertas pelo índice web.
4. **OpenStreetMap/Nominatim** — geocodificação assistida somente a partir das referências de localização já disponíveis nos anúncios.

Anúncios encontrados por índice web recebem `verification_status=discovered`. Isso significa oportunidade provável e não confirmação oficial de disponibilidade pelo portal de origem.

## Georreferenciamento assistido

Campos armazenados em `source_listings`:

- `latitude` e `longitude`;
- `geocode_status`;
- `geocode_precision`;
- `geocode_source`;
- `geocode_query`;
- `geocode_label`;
- `geocode_confidence`;
- `geocoded_at`;
- `location_signature`.

Política de precisão:

- `exact`: referência com precisão suficiente para ser tratada como localização informada;
- `address`: endereço sem precisão plena;
- `neighborhood`: bairro/localidade;
- `city`: município;
- sem referência suficiente: nenhum pin é apresentado.

O geocodificador não inventa um endereço. Quando só existe município, o pin representa apenas uma referência municipal. Se uma futura atualização do anúncio trouxer bairro/endereço mais preciso, a assinatura de localização muda e o anúncio é geocodificado novamente.

## Atualização dos anúncios

Enquanto a fonte operacional for o Brave Search, alterações feitas pelo anunciante não chegam em tempo real. O fluxo é:

`portal -> índice Brave atualizado -> descoberta agendada -> upsert source+external_id -> geocodificação se a localização mudou -> Betel Radar`

O workflow principal roda três vezes ao dia. O front-end consulta o Betel Cloud periodicamente enquanto estiver aberto e também possui sincronização manual. Quando a API oficial da OLX estiver disponível, ela deverá fornecer atualização mais direta e confiável.

## Automação Brave Search

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
- `supabase/migrations/20260907_v082_assisted_geocoding.sql`
- `v082-sync.js`
- `v082-real-data.js`
- `v082-opportunity-detail.js`
- `collector/sync-engine.js`
- `collector/supabase-rest.js`
- `collector/run-sync.js`
- `collector/run-discovery.js`
- `collector/geocode-listings.js`
- `collector/adapters/brave-search.js`
- `.github/workflows/betel-sync.yml`
- `.github/workflows/web-discovery.yml`
- `.github/workflows/geocode-listings.yml`

## Próximos passos

1. homologar os pins e popups do Mapa no desktop/mobile do build 8210;
2. iniciar enriquecimento manual/assistido de anunciante e canais de contato para prospecção dos serviços de filmagem aérea;
3. acompanhar novas execuções do Brave e validar atualização de localização quando o índice trouxer dados mais precisos;
4. melhorar a priorização do Score Betel com dados reais de área, tipo de imóvel, anunciante e qualidade visual quando confirmados;
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
