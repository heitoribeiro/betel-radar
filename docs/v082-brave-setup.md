# Ativação da Brave Search API no Betel Radar

A automação de descoberta já está pronta no repositório. Para ativar, os secrets abaixo devem existir no GitHub Actions.

## Secrets do GitHub Actions

No repositório, abra **Settings → Secrets and variables → Actions → New repository secret** e cadastre:

- `BETEL_WEB_DISCOVERY_ENABLED` = `true`
- `BRAVE_SEARCH_API_KEY` = chave da Brave Search API
- `SUPABASE_URL` = URL do projeto Betel-Radar
- `SUPABASE_SECRET_KEY` = secret key moderna do Supabase (`sb_secret_...`)

O backend também aceita temporariamente `SUPABASE_SERVICE_ROLE_KEY` como compatibilidade legada, mas a preferência é `SUPABASE_SECRET_KEY`.

Opcionalmente:

- `BETEL_DISCOVERY_UNAVAILABLE_AFTER_MISSES` = `6`
- `BETEL_DISCOVERY_REMOVE_AFTER_HOURS` = `336`

## Segurança

Não envie `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ou `BRAVE_SEARCH_API_KEY` em chats, issues ou commits. Elas devem existir somente como secrets do backend.

## Teste

Após configurar os secrets, execute manualmente o workflow **Betel Radar - descoberta web** em **Actions → Betel Radar - descoberta web → Run workflow**.

Valide em seguida:

1. conclusão `success` do workflow;
2. criação de uma nova linha em `sync_runs` com source `brave_search`;
3. anúncios novos/atualizados em `source_listings`;
4. exibição dos anúncios no Betel Radar após ativar o modo PRODUÇÃO e sincronizar.
