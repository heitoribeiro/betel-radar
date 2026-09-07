import {createHash} from 'node:crypto';
import {listActiveListings,patchListing} from './supabase-rest.js';

const NOMINATIM_URL='https://nominatim.openstreetmap.org/search';
const USER_AGENT='BetelRadar/0.8.2 (+https://github.com/heitoribeiro/betel-radar)';
const MIN_INTERVAL_MS=1100;
const ALGO_VERSION='2';
let lastRequestAt=0;
const queryCache=new Map();
const cityContextCache=new Map();

function env(name,fallback=''){
  return (process.env[name]??fallback).toString().trim();
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function stripAccents(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function norm(v=''){return stripAccents(v).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim()}
function signature(row){
  const parts=[ALGO_VERSION,row.address_text,row.neighborhood,row.city,row.state].map(v=>norm(v||''));
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0,24)
}
function hasStreetNumber(text=''){
  return /(?:rua|avenida|av\.?|travessa|alameda|estrada|rodovia|ba-\d{3}|br-\d{3})\b[^,;]{0,70}\b\d{1,6}\b/i.test(text)
}
function candidates(row){
  const state=row.state||'BA';const city=row.city||'';const neighborhood=row.neighborhood||'';const address=row.address_text||'';
  const out=[];
  if(address)out.push({precision:hasStreetNumber(address)?'exact':'address',query:[address,neighborhood,city,state,'Brasil'].filter(Boolean).join(', ')});
  if(neighborhood)out.push({precision:'neighborhood',query:[neighborhood,city,state,'Brasil'].filter(Boolean).join(', ')});
  // Se o anúncio já informa bairro/localidade, não usamos o centro do município como fallback silencioso.
  // Isso evita posicionar Areia Branca, Barra do Jacuípe etc. no centro da cidade quando o bairro não foi validado.
  if(city&&!neighborhood&&!address)out.push({precision:'city',query:[city,state,'Brasil'].filter(Boolean).join(', ')});
  const seen=new Set();return out.filter(x=>{const k=norm(x.query);if(seen.has(k))return false;seen.add(k);return true})
}
function countryOk(result){
  const code=String(result?.address?.country_code||'').toLowerCase();return !code||code==='br'
}
function stateOk(result,row){
  const wanted=norm(row.state||'BA');if(!wanted)return true;
  const a=result?.address||{};const state=norm(a.state||a.region||'');
  return !state||state.includes('bahia')||state===wanted||wanted==='ba'
}
function resultLocalityValues(result){
  const a=result?.address||{};
  return [result?.name,a.neighbourhood,a.suburb,a.quarter,a.city_district,a.hamlet,a.village,a.town,a.city,a.municipality]
    .filter(Boolean).map(norm)
}
function localityMatch(result,wanted){
  const w=norm(wanted);if(!w)return false;
  const vals=resultLocalityValues(result);
  if(vals.some(v=>v===w))return true;
  return vals.some(v=>v.includes(w)||w.includes(v))
}
function cityMatch(result,row){
  const w=norm(row.city||'');if(!w)return true;
  const a=result?.address||{};
  const vals=[a.city,a.town,a.municipality,a.county,a.city_district,result?.display_name].filter(Boolean).map(norm);
  return vals.some(v=>v===w||v.includes(w))
}
function bboxOf(result){
  const b=result?.boundingbox;if(!Array.isArray(b)||b.length!==4)return null;
  const nums=b.map(Number);if(nums.some(v=>!Number.isFinite(v)))return null;
  return {south:nums[0],north:nums[1],west:nums[2],east:nums[3]}
}
function insideBounds(result,bounds){
  if(!bounds)return false;const lat=Number(result?.lat),lon=Number(result?.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;
  const pad=.015;
  return lat>=bounds.south-pad&&lat<=bounds.north+pad&&lon>=bounds.west-pad&&lon<=bounds.east+pad
}
async function throttle(){
  const wait=Math.max(0,MIN_INTERVAL_MS-(Date.now()-lastRequestAt));if(wait)await sleep(wait);lastRequestAt=Date.now()
}
async function requestNominatim(query,limit=6){
  const key=`${norm(query)}|${limit}`;if(queryCache.has(key))return queryCache.get(key);
  await throttle();
  const params=new URLSearchParams({q:query,format:'jsonv2',addressdetails:'1',namedetails:'1',limit:String(limit),countrycodes:'br','accept-language':'pt-BR'});
  const email=env('BETEL_GEOCODER_EMAIL');if(email)params.set('email',email);
  let response=await fetch(`${NOMINATIM_URL}?${params}`,{headers:{Accept:'application/json','User-Agent':USER_AGENT}});
  if(response.status===429||response.status>=500){await sleep(2200);await throttle();response=await fetch(`${NOMINATIM_URL}?${params}`,{headers:{Accept:'application/json','User-Agent':USER_AGENT}})}
  if(!response.ok)throw new Error(`Nominatim HTTP ${response.status}`);
  const data=await response.json();const rows=Array.isArray(data)?data:[];queryCache.set(key,rows);return rows
}
async function cityContext(row){
  const city=row.city||'';if(!city)return {bounds:null,result:null};
  const key=norm(`${city}|${row.state||'BA'}`);if(cityContextCache.has(key))return cityContextCache.get(key);
  const results=await requestNominatim([city,row.state||'BA','Brasil'].filter(Boolean).join(', '),5);
  const picked=results.find(r=>countryOk(r)&&stateOk(r,row)&&cityMatch(r,row))||results.find(r=>countryOk(r)&&cityMatch(r,row))||null;
  const ctx={result:picked,bounds:bboxOf(picked)};cityContextCache.set(key,ctx);return ctx
}
function scoreNeighborhood(result,row,ctx){
  if(!countryOk(result)||!stateOk(result,row))return -Infinity;
  if(!localityMatch(result,row.neighborhood))return -Infinity;
  const inCity=cityMatch(result,row)||insideBounds(result,ctx?.bounds);if(!inCity)return -Infinity;
  const a=result.address||{};const wanted=norm(row.neighborhood||'');let score=0;
  if(norm(result.name||'')===wanted)score+=8;
  if([a.neighbourhood,a.suburb,a.quarter,a.city_district,a.hamlet,a.village].filter(Boolean).map(norm).some(v=>v===wanted))score+=7;
  const type=norm(result.addresstype||result.type||'');if(['suburb','neighbourhood','quarter','hamlet','village','residential'].some(t=>type.includes(t)))score+=4;
  if(cityMatch(result,row))score+=4;if(insideBounds(result,ctx?.bounds))score+=3;
  score+=Math.min(2,Number(result.importance)||0);
  return score
}
function scoreAddress(result,row,ctx){
  if(!countryOk(result)||!stateOk(result,row))return -Infinity;
  if(row.city&&!cityMatch(result,row)&&!insideBounds(result,ctx?.bounds))return -Infinity;
  let score=0;if(cityMatch(result,row))score+=3;if(insideBounds(result,ctx?.bounds))score+=2;
  if(row.neighborhood&&localityMatch(result,row.neighborhood))score+=5;
  score+=Math.min(2,Number(result.importance)||0);return score
}
function scoreCity(result,row){
  if(!countryOk(result)||!stateOk(result,row)||!cityMatch(result,row))return -Infinity;
  const type=norm(result.addresstype||result.type||'');let score=5;if(['city','town','municipality'].some(t=>type.includes(t)))score+=3;
  score+=Math.min(2,Number(result.importance)||0);return score
}
function pickBest(results,option,row,ctx){
  const scored=results.map(r=>({r,score:option.precision==='neighborhood'?scoreNeighborhood(r,row,ctx):option.precision==='city'?scoreCity(r,row):scoreAddress(r,row,ctx)}))
    .filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
  return scored[0]?.r||null
}
async function resolveRow(row){
  const sig=signature(row);const now=new Date();const geocodedAt=row.geocoded_at?new Date(row.geocoded_at):null;
  const unresolvedFresh=row.geocode_status==='unresolved'&&geocodedAt&&!isNaN(geocodedAt)&&((now-geocodedAt)<7*864e5);
  const sameSignature=row.location_signature===sig;
  if(row.latitude!=null&&row.longitude!=null&&row.geocode_source==='source')return {action:'skip',reason:'source_coordinates'};
  if(sameSignature&&row.geocode_status==='resolved'&&row.latitude!=null&&row.longitude!=null)return {action:'skip',reason:'unchanged'};
  if(sameSignature&&unresolvedFresh)return {action:'skip',reason:'unresolved_recent'};

  const options=candidates(row);const ctx=await cityContext(row);
  if(!options.length){
    return {action:'update',patch:{latitude:null,longitude:null,geocode_status:'unresolved',geocode_source:'nominatim_v2',geocode_query:null,geocode_label:null,geocode_confidence:null,geocode_precision:null,geocoded_at:now.toISOString(),location_signature:sig}}
  }
  for(const option of options){
    const results=await requestNominatim(option.query,8);const result=pickBest(results,option,row,ctx);if(!result)continue;
    const lat=Number(result.lat),lng=Number(result.lon);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
    return {action:'update',patch:{
      latitude:lat,longitude:lng,
      geocode_status:'resolved',geocode_precision:option.precision,geocode_source:'nominatim_v2',geocode_query:option.query,
      geocode_label:result.display_name||option.query,geocode_confidence:Number.isFinite(Number(result.importance))?Number(result.importance):null,
      geocoded_at:now.toISOString(),location_signature:sig
    }}
  }
  return {action:'update',patch:{latitude:null,longitude:null,geocode_status:'unresolved',geocode_source:'nominatim_v2',geocode_query:options[0]?.query||null,geocode_label:null,geocode_confidence:null,geocode_precision:null,geocoded_at:now.toISOString(),location_signature:sig}}
}

async function main(){
  const rows=await listActiveListings();const max=Math.max(1,Number(env('BETEL_GEOCODE_MAX_ROWS','50'))||50);
  const stats={active:rows.length,checked:0,resolved:0,unresolved:0,skipped:0,errors:0,updated:0};
  for(const row of rows.slice(0,max)){
    stats.checked++;
    try{
      const result=await resolveRow(row);
      if(result.action==='skip'){stats.skipped++;continue}
      await patchListing(row.source,row.external_id,result.patch);
      stats.updated++;
      if(result.patch.geocode_status==='resolved')stats.resolved++;else stats.unresolved++;
    }catch(error){stats.errors++;console.error(`Geocode ${row.source}:${row.external_id}:`,String(error?.message||error))}
  }
  console.log(JSON.stringify({ok:stats.errors===0,provider:'nominatim_v2',algorithm:ALGO_VERSION,cache_queries:queryCache.size,stats},null,2));
  if(stats.errors&&stats.resolved===0&&stats.unresolved===0)process.exitCode=1;
}

await main();
