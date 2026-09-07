import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSnapshot} from './sync-engine.js';

test('insere anuncio novo como active',()=>{
  const now='2026-09-07T01:00:00.000Z';
  const {rows,stats}=reconcileSnapshot([],[{source:'olx',external_id:'1',title:'Imóvel A'}],{now});
  assert.equal(rows.length,1);
  assert.equal(rows[0].availability_status,'active');
  assert.equal(rows[0].first_seen_at,now);
  assert.equal(stats.inserted,1);
});

test('primeira ausencia vira missing e segunda unavailable',()=>{
  const base={source:'olx',external_id:'1',title:'Imóvel A',availability_status:'active',consecutive_misses:0,first_seen_at:'2026-09-06T00:00:00.000Z',last_seen_at:'2026-09-06T23:00:00.000Z'};
  const first=reconcileSnapshot([base],[],{now:'2026-09-07T00:00:00.000Z'}).rows[0];
  assert.equal(first.availability_status,'missing');
  assert.equal(first.consecutive_misses,1);
  const second=reconcileSnapshot([first],[],{now:'2026-09-07T01:00:00.000Z'}).rows[0];
  assert.equal(second.availability_status,'unavailable');
  assert.equal(second.consecutive_misses,2);
  assert.equal(second.unavailable_at,'2026-09-07T01:00:00.000Z');
});

test('descoberta web pode permanecer active até o limite de ausências',()=>{
  const base={source:'olx',external_id:'1',title:'Imóvel A',availability_status:'active',consecutive_misses:0,first_seen_at:'2026-09-06T00:00:00.000Z',last_seen_at:'2026-09-06T23:00:00.000Z'};
  const first=reconcileSnapshot([base],[],{now:'2026-09-07T00:00:00.000Z',unavailableAfterMisses:6,keepActiveUntilUnavailable:true}).rows[0];
  assert.equal(first.availability_status,'active');
  assert.equal(first.consecutive_misses,1);
  const sixth=reconcileSnapshot([{...first,consecutive_misses:5}],[],{now:'2026-09-08T16:00:00.000Z',unavailableAfterMisses:6,keepActiveUntilUnavailable:true}).rows[0];
  assert.equal(sixth.availability_status,'unavailable');
});

test('anuncio que reaparece volta a active e zera ausencias',()=>{
  const old={source:'olx',external_id:'1',title:'Antigo',availability_status:'unavailable',consecutive_misses:3,first_seen_at:'2026-09-01T00:00:00.000Z',last_seen_at:'2026-09-06T00:00:00.000Z',missing_since:'2026-09-06T01:00:00.000Z',unavailable_at:'2026-09-06T02:00:00.000Z'};
  const {rows}=reconcileSnapshot([old],[{source:'olx',external_id:'1',title:'Atualizado'}],{now:'2026-09-07T02:00:00.000Z'});
  assert.equal(rows[0].availability_status,'active');
  assert.equal(rows[0].consecutive_misses,0);
  assert.equal(rows[0].missing_since,null);
  assert.equal(rows[0].unavailable_at,null);
  assert.equal(rows[0].title,'Atualizado');
  assert.equal(rows[0].first_seen_at,old.first_seen_at);
});

test('confirmacao manual de indisponibilidade nao reativa por indice externo',()=>{
  const old={source:'vivareal',external_id:'10',title:'Anúncio antigo',availability_status:'unavailable',verification_status:'stale',manual_availability_lock:true,manual_unavailable_reason:'confirmado',manual_unavailable_at:'2026-09-07T02:00:00.000Z',unavailable_at:'2026-09-07T02:00:00.000Z',first_seen_at:'2026-09-01T00:00:00.000Z'};
  const {rows,stats}=reconcileSnapshot([old],[{source:'vivareal',external_id:'10',title:'Ainda indexado'}],{now:'2026-09-07T03:00:00.000Z'});
  assert.equal(rows[0].availability_status,'unavailable');
  assert.equal(rows[0].verification_status,'stale');
  assert.equal(rows[0].manual_availability_lock,true);
  assert.equal(rows[0].title,'Ainda indexado');
  assert.equal(stats.manualLocked,1);
});

test('anuncio indisponivel por 7 dias vira removed',()=>{
  const old={source:'olx',external_id:'1',title:'Imóvel A',availability_status:'unavailable',consecutive_misses:5,first_seen_at:'2026-08-30T00:00:00.000Z',last_seen_at:'2026-08-31T00:00:00.000Z',missing_since:'2026-08-31T01:00:00.000Z',unavailable_at:'2026-08-31T01:00:00.000Z'};
  const {rows,stats}=reconcileSnapshot([old],[],{now:'2026-09-07T01:00:00.000Z',removeAfterHours:168});
  assert.equal(rows[0].availability_status,'removed');
  assert.equal(stats.removed,1);
});
