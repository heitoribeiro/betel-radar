import {createHash} from 'node:crypto';
import {listActiveListings,upsertListings} from './supabase-rest.js';

const NOMINATIM_URL='https://nominatim.openstreetmap.org/search';
const USER_AGENT='BetelRadar/0.8.2 (+https://github.com/heitoribeiro/betel-radar)';
const MIN_INTERVAL_MS=1100;
let lastRequestAt=0;
const queryCache=new Map();

function env(name,fallback=''){
  return (process.env[name]??fallback).toString().trim();
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function stripAccents(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function norm(v=''){return stripAccents(v).toLowerCase().replace(/\s+/g,' ').trim()}
function signature(row){
  const parts=[row.address_text,row.neighborhood,row.city,row.state].map(v=>norm(v||''));
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0,24)
}
function hasStreetNumber(text=''){
  return /(?:rua|avenida|av\.?|travessa|alameda|estrada|rodovia)\b[^,;]{2,70}\b\d{1,6}\b/i.test(text)
}
function candidates(row){
  const state=row.state||'BA';const city=row.city||'';const neighborhood=row.neighborhood||'';const address=row.address_text||'';
  const out=[];
  if(address){
    out.push({precision:hasStreetNumber(address)?'exact':'address',query:[address,neighborhood,city,state,'Brasil'].filter(Boolean).join(', ')});
  }
  if(neighborhood){
    out.push({precision:'neighborhood',query:[neighborhood,city,state,'Brasil'].filter(Boolean).join(', ')});
  }
  if(city){
    out.push({precision:'city',query:[city,state,'Brasil'].filter(Boolean).join(', ')});
  }
  const seen=new Set();return out.filter(x=>{const k=norm(x.query);if(seen.has(k))return false;seen.add(k);return true})
}
function isAcceptable(result,row){
  if(!result)return false;
  const addr=result.address||{};
  if(addr.country_code&&String(addr.country_code).toLowerCase()!=='br')return false;
  const display=norm(result.display_name||'');
  if(row.city&&!display.includes(norm(row.city)))return false;
  return true
}
async function throttle(){
  const wait=Math.max(0,MIN_INTERVAL_MS-(Date.now()-lastRequestAt));if(wait)await sleep(wait);lastRequestAt=Date.now()
}
async function requestNominatim(query){
  const key=norm(query);if(queryCache.has(key))return queryCache.get(key);
  await throttle();
  const params=new URLSearchParams({q:query,format:'jsonv2',addressdetails:'1',limit:'1',countrycodes:'br','accept-language':'pt-BR'});
  const email=env('BETEL_GEOCODER_EMAIL');if(email)params.set('email',email);
  let response=await fetch(`${NOMINATIM_URL}?${params}`,{headers:{Accept:'application/json','User-Agent':USER_AGENT}});
  if(response.status===429||response.status>=500){await sleep(2200);await throttle();response=await fetch(`${NOMINATIM_URL}?${params}`,{headers:{Accept:'application/json','User-Agent':USER_AGENT}})}
  if(!response.ok)throw new Error(`Nominatim HTTP ${response.status}`);
  const data=await response.json();const result=Array.isArray(data)?data[0]||null:null;queryCache.set(key,result);return result
}
async function resolveRow(row){
  const sig=signature(row);const now=new Date();const geocodedAt=row.geocoded_at?new Date(row.geocoded_at):null;
  const unresolvedFresh=row.geocode_status==='unresolved'&&geocodedAt&&!isNaN(geocodedAt)&&((now-geocodedAt)<7*864e5);
  const sameSignature=row.location_signature===sig;
  if(row.latitude!=null&&row.longitude!=null&&row.geocode_source==='source')return {action:'skip',reason:'source_coordinates'};
  if(sameSignature&&row.geocode_status==='resolved'&&row.latitude!=null&&row.longitude!=null)return {action:'skip',reason:'unchanged'};
  if(sameSignature&&unresolvedFresh)return {action:'skip',reason:'unresolved_recent'};

  const options=candidates(row);
  if(!options.length){
    return {action:'update',row:{source:row.source,external_id:row.external_id,geocode_status:'unresolved',geocode_source:'nominatim',geocode_query:null,geocode_label:null,geocode_confidence:null,geocode_precision:null,geocoded_at:now.toISOString(),location_signature:sig}}
  }
  for(const option of options){
    const result=await requestNominatim(option.query);
    if(!isAcceptable(result,row))continue;
    const lat=Number(result.lat),lng=Number(result.lon);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
    return {action:'update',row:{
      source:row.source,external_id:row.external_id,
      latitude:lat,longitude:lng,
      geocode_status:'resolved',geocode_precision:option.precision,geocode_source:'nominatim',geocode_query:option.query,
      geocode_label:result.display_name||option.query,geocode_confidence:Number.isFinite(Number(result.importance))?Number(result.importance):null,
      geocoded_at:now.toISOString(),location_signature:sig
    }}
  }
  return {action:'update',row:{source:row.source,external_id:row.external_id,geocode_status:'unresolved',geocode_source:'nominatim',geocode_query:options[0]?.query||null,geocode_label:null,geocode_confidence:null,geocode_precision:null,geocoded_at:now.toISOString(),location_signature:sig}}
}

async function main(){
  const rows=await listActiveListings();const max=Math.max(1,Number(env('BETEL_GEOCODE_MAX_ROWS','50'))||50);
  const updates=[];const stats={active:rows.length,checked:0,resolved:0,unresolved:0,skipped:0,errors:0};
  for(const row of rows.slice(0,max)){
    stats.checked++;
    try{
      const result=await resolveRow(row);
      if(result.action==='skip'){stats.skipped++;continue}
      updates.push(result.row);
      if(result.row.geocode_status==='resolved')stats.resolved++;else stats.unresolved++;
    }catch(error){stats.errors++;console.error(`Geocode ${row.source}:${row.external_id}:`,String(error?.message||error))}
  }
  if(updates.length)await upsertListings(updates,{chunkSize:50});
  console.log(JSON.stringify({ok:stats.errors===0,provider:'nominatim',updates:updates.length,cache_queries:queryCache.size,stats},null,2));
  if(stats.errors&&stats.resolved===0&&stats.unresolved===0)process.exitCode=1;
}

await main();
