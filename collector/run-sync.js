import {reconcileSnapshot} from './sync-engine.js';
import {listListings,createSyncRun,finishSyncRun,upsertListings} from './supabase-rest.js';

function value(name,fallback=''){
  return (process.env[name]??fallback).toString().trim();
}
function intValue(name,fallback){
  const n=Number(value(name,fallback));
  return Number.isFinite(n)?n:fallback;
}

function assertEnabled(){
  if(value('BETEL_SYNC_ENABLED','false').toLowerCase()!=='true'){
    console.log('Betel Radar sync: desativado. Defina BETEL_SYNC_ENABLED=true para habilitar.');
    process.exit(0);
  }
}

async function fetchSnapshot(source){
  const endpoint=value('BETEL_SOURCE_ENDPOINT');
  if(!endpoint)throw new Error('BETEL_SOURCE_ENDPOINT não configurado');
  const headers={Accept:'application/json'};
  const token=value('BETEL_SOURCE_TOKEN');
  if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetch(endpoint,{headers,cache:'no-store'});
  const text=await response.text();
  if(!response.ok)throw new Error(`Fonte autorizada: HTTP ${response.status} ${text.slice(0,500)}`);
  const payload=text?JSON.parse(text):{};
  const listings=Array.isArray(payload)?payload:payload.listings;
  if(!Array.isArray(listings))throw new Error('Fonte autorizada não retornou um array listings');
  return listings.map(row=>({
    ...row,
    source:String(row.source||source).toLowerCase(),
    external_id:String(row.external_id??row.externalId??'')
  })).filter(row=>row.external_id);
}

function runPatch(stats,status='success',extra={}){
  return {
    status,
    found_count:stats?.found||0,
    inserted_count:stats?.inserted||0,
    updated_count:stats?.updated||0,
    missing_count:stats?.missing||0,
    unavailable_count:stats?.unavailable||0,
    removed_count:stats?.removed||0,
    ...extra
  };
}

async function main(){
  assertEnabled();
  const source=value('BETEL_SOURCE','olx').toLowerCase();
  const startedAt=new Date().toISOString();
  let run=null;
  try{
    run=await createSyncRun(source,{runner:'github-actions',started_at:startedAt});
    const [existing,incoming]=await Promise.all([
      listListings(source),
      fetchSnapshot(source)
    ]);
    const {rows,stats}=reconcileSnapshot(existing||[],incoming||[],{
      unavailableAfterMisses:intValue('BETEL_UNAVAILABLE_AFTER_MISSES',2),
      removeAfterHours:intValue('BETEL_REMOVE_AFTER_HOURS',168),
      now:new Date().toISOString()
    });
    await upsertListings(rows);
    await finishSyncRun(run?.id,runPatch(stats,'success',{metadata:{source,runner:'github-actions'}}));
    console.log(JSON.stringify({ok:true,source,stats},null,2));
  }catch(error){
    const message=String(error?.stack||error?.message||error);
    console.error(message);
    try{await finishSyncRun(run?.id,runPatch(null,'error',{error_message:message.slice(0,4000)}))}catch(logError){console.error('Falha ao registrar erro no Supabase:',logError)}
    process.exitCode=1;
  }
}

await main();
