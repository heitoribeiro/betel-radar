# Betel Radar v0.8.2 — Coletor autorizado

Este diretório define o contrato do backend que alimentará o Betel Radar com anúncios reais.

## Princípio de conformidade

O coletor não deve executar crawling da OLX sem autorização. A integração deverá usar API, feed, endpoint ou outro mecanismo expressamente autorizado pela fonte.

## Fluxo

Fonte autorizada → adaptador → normalização → Supabase → Betel Radar

## Contrato de saída

O endpoint consumido pelo `v082-sync.js` deve retornar JSON no formato:

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
      "image_urls": [],
      "availability_status": "active",
      "first_seen_at": "2026-09-06T20:00:00Z",
      "last_seen_at": "2026-09-06T20:00:00Z"
    }
  ]
}
```

## Regras de sincronização

- anúncio novo: `active`, cria registro e `first_seen_at`;
- anúncio encontrado novamente: atualiza `last_seen_at` e zera `consecutive_misses`;
- primeira ausência: `missing`;
- segunda ausência consecutiva: `unavailable`;
- após período de retenção definido: `removed`;
- anúncios removidos permanecem no banco para histórico e auditoria;
- `source + external_id` é a chave de deduplicação.

## Frequência inicial

60 minutos. O intervalo deverá ser configurável no backend e respeitar os limites definidos pela fonte autorizada.

## Próxima etapa

Assim que a OLX informar o mecanismo autorizado de acesso, implementar o adaptador correspondente sem alterar a camada de banco nem o front-end.
