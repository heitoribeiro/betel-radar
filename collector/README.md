# Betel Radar v0.8.2 — Coletor autorizado

Este diretório contém o backend independente da fonte que alimentará o Betel Radar com anúncios reais.

## Princípio de conformidade

O coletor não executa crawling da OLX sem autorização. A integração deverá usar API, feed, endpoint ou outro mecanismo expressamente autorizado pela fonte.

## Fluxo

Fonte autorizada → `run-sync.js` → reconciliação → Supabase → Betel Radar

## Componentes

- `sync-engine.js`: ciclo `active → missing → unavailable → removed`;
- `supabase-rest.js`: leitura, upsert e registro das execuções no Supabase;
- `run-sync.js`: orquestrador da coleta;
- `sync-engine.test.js`: testes da política de disponibilidade;
- `.env.example`: variáveis necessárias sem segredos reais;
- `.github/workflows/betel-sync.yml`: execução horária preparada para GitHub Actions.

## Contrato da fonte autorizada

O endpoint configurado em `BETEL_SOURCE_ENDPOINT` deve retornar JSON no formato:

```json
{
  "listings": [
    {
      "source": "olx",
      "external_id": "123456",
      "source_url": "https://...",
      "title": "Apartamento ...",
      "description": "...",
      "advertiser": "...",
      "advertiser_type": "professional",
      "listing_type": "sale",
      "property_type": "apartment",
      "price": 650000,
      "condominium_fee": 650,
      "iptu": 1200,
      "city": "Lauro de Freitas",
      "state": "BA",
      "neighborhood": "...",
      "latitude": -12.0,
      "longitude": -38.0,
      "bedrooms": 3,
      "bathrooms": 2,
      "parking_spaces": 2,
      "area_m2": 95,
      "image_urls": []
    }
  ]
}
```

## Regras de sincronização

- anúncio novo: `active`, cria registro e `first_seen_at`;
- anúncio encontrado novamente: atualiza `last_seen_at` e zera `consecutive_misses`;
- primeira ausência: `missing`;
- segunda ausência consecutiva: `unavailable`;
- após 168 horas indisponível por padrão: `removed`;
- anúncios removidos permanecem no banco para histórico e auditoria;
- `source + external_id` é a chave de deduplicação.

## Agendamento

O workflow `Betel Radar - sincronizacao autorizada` está programado para uma tentativa a cada hora, aos 17 minutos. Enquanto `BETEL_SYNC_ENABLED` não estiver definido como `true`, a coleta real termina de forma segura sem consultar nenhuma fonte.

Secrets esperados no GitHub quando a integração estiver autorizada:

- `BETEL_SYNC_ENABLED`
- `BETEL_SOURCE`
- `BETEL_SOURCE_ENDPOINT`
- `BETEL_SOURCE_TOKEN` (se necessário)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BETEL_UNAVAILABLE_AFTER_MISSES` (opcional)
- `BETEL_REMOVE_AFTER_HOURS` (opcional)

Nunca inserir a `SUPABASE_SERVICE_ROLE_KEY` no front-end, no README ou em arquivos versionados.

## Banco

Antes da ativação real, aplicar a migration:

`supabase/migrations/20260906_v082_opportunity_sync.sql`

## Testes

No diretório `collector`:

```bash
npm test
```

## Próxima etapa

1. aplicar a migration no Supabase de produção;
2. aguardar a OLX informar o mecanismo autorizado;
3. configurar os secrets;
4. executar `workflow_dispatch` para homologação manual;
5. somente após validar inclusão/atualização/retirada, habilitar `BETEL_SYNC_ENABLED=true` para o ciclo horário.
