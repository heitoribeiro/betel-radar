# Betel Radar v0.8.2 — qualidade do georreferenciamento

## Problema resolvido

Um anúncio que informava `Areia Branca, Lauro de Freitas/BA` foi inicialmente exibido no centro municipal porque o Nominatim não validou o bairro na primeira consulta e o geocodificador antigo caiu silenciosamente para a coordenada da cidade.

O mapa Leaflet/OpenStreetMap não era a causa: ele apenas desenhava a coordenada já armazenada no Betel Cloud.

## Política atual

1. Coordenada informada pela própria fonte tem prioridade máxima.
2. Endereço é tentado antes de bairro/localidade.
3. Para bairro/localidade, o Nominatim retorna vários candidatos; o Betel Radar pontua os resultados por nome, tipo de local, município e limite geográfico municipal.
4. Se o anúncio informa bairro e esse bairro não puder ser validado, o sistema **não** cai para o centro do município. O registro fica `unresolved` e não recebe pin até haver referência confiável.
5. O catálogo `public.location_references` armazena referências verificadas para localidades ambíguas ou ausentes no geocodificador. Ele permite corrigir futuros anúncios daquela mesma localidade sem mudar código.
6. Mudança de endereço/bairro/cidade altera `location_signature` e força nova geocodificação.

## Areia Branca

Referência verificada cadastrada:

- Localidade: Areia Branca
- Município: Lauro de Freitas/BA
- Latitude: `-12.84755`
- Longitude: `-38.3593`
- Fonte: OpenStreetMap
- Referência: `node/2717287237`

## Resultado operacional

Depois da revisão do algoritmo, bairros não resolvidos deixam de ser apresentados em posição municipal enganosa. O mapa mostra apenas coordenadas compatíveis com o nível de precisão indicado no popup.

Arquivos relacionados:

- `collector/geocode-listings.js`
- `collector/supabase-rest.js`
- `supabase/migrations/20260907_v082_location_references.sql`
- `.github/workflows/geocode-listings.yml`
