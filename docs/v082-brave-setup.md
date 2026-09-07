# Ativação da Brave Search API no Betel Radar

A automação de descoberta já está pronta no repositório, mas permanece desativada até a chave da Brave Search API e os secrets do GitHub Actions serem configurados.

## Secrets do GitHub Actions

No repositório, abra **Settings → Secrets and variables → Actions → New repository secret** e cadastre:

- `BETEL_WEB_DISCOVERY_ENABLED` = `true`
- `BRAVE_SEARCH_API_KEY` = chave da Brave Search API
- `SUPABASE_URL` = URL do projeto Betel-Radar
- `SUPABASE_SERVICE_ROLE_KEY` = service role do Supabase

Opcionalmente:

- `BETEL_DISCOVERY_UNAVAILABLE_AFTER_MISSES` = `6`
- `BETEL_DISCOVERY_REMOVE_AFTER_HOURS` = `336`

## Segurança

Não envie `SUPABASE_SERVICE_ROLE_KEY` em chats, issues ou commits. Ela deve existir somente como secret do backend.

A chave Brave também deve permanecer em GitHub Secrets e não ser incorporada no front-end.

## Teste

Após configurar os secrets, execute manualmente o workflow **Betel Radar - descoberta web** em **Actions → Betel Radar - descoberta web → Run workflow**.

Valide em seguida:

1. conclusão `success` do workflow;
2. criação de uma nova linha em `sync_runs` com source `brave_search`;
3. anúncios novos/atualizados em `source_listings`;
4. exibição dos anúncios no Betel Radar após ativar o modo PRODUÇÃO e sincronizar.
