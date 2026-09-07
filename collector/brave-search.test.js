import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPrice,extractArea,normalizeBraveResult} from './adapters/brave-search.js';

test('extrai preco brasileiro com separador de milhar',()=>{
  assert.equal(extractPrice('por R$ 1.200.000 - Viva Real'),1200000);
  assert.equal(extractPrice('R$ 1.649.710'),1649710);
  assert.equal(extractPrice('R$ 350.000,00'),350000);
});

test('extrai area em m², m2 e metros quadrados',()=>{
  assert.equal(extractArea('6440 m²'),6440);
  assert.equal(extractArea('43000m2'),43000);
  assert.equal(extractArea('180000 metros quadrados'),180000);
});

test('normaliza resultado direto do Viva Real',()=>{
  const row=normalizeBraveResult({
    url:'https://www.vivareal.com.br/imovel/fazenda---sitio-9-quartos-centro-bairros-mata-de-sao-joao-com-garagem-6440m2-venda-RS1200000-id-1037877278/',
    title:'Fazenda/Sítio 6440 m² em Centro em Mata de São João, por R$ 1.200.000 - Viva Real',
    description:'Imóvel à venda'
  },{query:'teste',group:'"Mata de São João" BA',rank:1});
  assert.equal(row.source,'vivareal');
  assert.equal(row.external_id,'1037877278');
  assert.equal(row.price,1200000);
  assert.equal(row.area_m2,6440);
  assert.equal(row.city,'Mata de São João');
});
