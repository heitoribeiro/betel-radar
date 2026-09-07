# v0.8.2 — correção de localização e feedback de disponibilidade

Build 8212.

## Corrigir localização

A ficha de uma oportunidade real possui o comando **Corrigir localização**. O usuário autenticado pode:

- tocar no mapa ou arrastar o marcador;
- salvar a nova latitude/longitude para aquele anúncio;
- opcionalmente salvar a posição como referência verificada do bairro/localidade.

Correções manuais usam `geocode_source=manual` e `geocode_precision=manual`. Se endereço/bairro/cidade do anúncio mudar em uma coleta futura, a assinatura de localização muda e o geocodificador pode avaliar novamente a referência.

Ao salvar como referência do bairro, o registro é incorporado ao catálogo `location_references`, permitindo reutilização em anúncios futuros da mesma localidade.

## Anúncio indisponível

A ficha também possui **Marcar indisponível**. A ação:

- altera o anúncio para `availability_status=unavailable`;
- aplica `manual_availability_lock=true`;
- registra auditoria em `listing_admin_events`;
- remove a oportunidade da consulta pública de anúncios ativos.

O motor de reconciliação respeita o bloqueio manual. Portanto, uma página confirmada como indisponível não volta a ficar ativa apenas porque continua presente no índice do Brave Search.

Resultados cujo título/trecho do mecanismo de busca já indique claramente `indisponível`, `removido`, `não encontrado`, `404` ou equivalente são descartados antes da inserção.

Como a descoberta atual depende de um índice externo, não é possível garantir a disponibilidade de uma página sem uma fonte oficial ou verificação humana. O fluxo atual prioriza não fazer crawling direto dos portais: descoberta via Brave, abertura manual do anúncio e feedback operacional quando o link estiver indisponível.
