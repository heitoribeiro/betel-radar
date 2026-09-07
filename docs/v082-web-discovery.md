# Betel Radar v0.8.2 — descoberta web

## Objetivo

Permitir que o Betel Radar comece a trabalhar com oportunidades reais/prováveis enquanto a integração oficial da OLX ainda aguarda API/feed/endpoint autorizado.

A descoberta web não faz crawling direto da OLX ou Viva Real. O backend consulta o índice da Brave Search API e grava no Betel Cloud apenas URLs de anúncios diretos encontradas nos resultados.

## Fontes iniciais

- OLX, através de resultados indexados no Brave Search;
- Viva Real, através de resultados indexados no Brave Search.

## Status dos anúncios

Um resultado de índice web entra como:

- `availability_status = active`
- `verification_status = discovered`
- `discovered_via = brave_search` em ciclos automatizados;
- `discovered_via = web_search_seed` no lote inicial cadastrado antes da chave Brave ser configurada.

`discovered` significa que a página foi encontrada em um índice de busca e parece ser uma oportunidade atual. Não representa confirmação oficial de disponibilidade pelo portal.

Quando a API oficial da OLX estiver disponível, os anúncios confirmados poderão ser promovidos para `verification_status = verified`.

## Política de retenção

Como índices de busca podem deixar de retornar uma página temporariamente, uma ausência isolada não retira o anúncio do Radar.

Configuração inicial:

- execução: 3 vezes ao dia;
- `unavailable` após 6 ciclos consecutivos sem reencontro;
- `removed` após 14 dias em indisponibilidade;
- se reaparecer no índice, o anúncio volta a `active` e zera as ausências.

## Escopo inicial das pesquisas

Portais:
- `olx.com.br`
- `vivareal.com.br`

Regiões:
- Lauro de Freitas;
- Camaçari;
- Mata de São João;
- Simões Filho / Dias d'Ávila / Pojuca.

Termos:
- terreno;
- lote;
- sítio;
- chácara;
- fazenda.

## Automação

Workflow: `.github/workflows/web-discovery.yml`

Secrets necessários:

- `BETEL_WEB_DISCOVERY_ENABLED=true`
- `BRAVE_SEARCH_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Nunca registrar as duas chaves privadas em código, issue, README ou chat público.

## Lote inicial

Antes da ativação do Brave Search API, foram adicionadas ao Supabase 10 oportunidades encontradas por busca web atual, provenientes de OLX e Viva Real. Todas estão marcadas como `discovered`, preservando a diferença entre oportunidade encontrada e anúncio oficialmente verificado.
