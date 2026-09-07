import {fetchBraveDiscovery} from './adapters/brave-search.js';
import {reconcileSnapshot} from './sync-engine.js';
import {listListings,createSyncRun,finishSyncRun,upsertListings} from './supabase-rest.js';

function env(name,fallback=''){
  return (process.env[name]??fallback).toString().trim();
}
function intValue(name,fallback){
  const n=Number(env(name,fallback));
  return Number.isFinite(n)?n:fallback;
}
function assertEnabled(){
  if(env('BETEL_WEB_DISCOVERY_ENABLED','false').toLowerCase()!=='true'){
    console.log('Betel Radar web discovery: desativado. Defina BETEL_WEB_DISCOVERY_ENABLED=true para habilitar.');
    process.exit(0);
  }
}
function sumStats(total,stats){
  for(const key of ['found','inserted','updated','missing','unavailable','removed'])total[key]=(total[key]||0)+(stats[key]||0);
  return total;
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
  let run=null;
  const startedAt=new Date().toISOString();
  try{
    run=await createSyncRun('brave_search',{runner:'github-actions',started_at:startedAt,targets:['olx','vivareal']});
    const {listings,queries}=await fetchBraveDiscovery();
    const groups=new Map();
    for(const row of listings){
      if(!groups.has(row.source))groups.set(row.source,[]);
      groups.get(row.source).push(row);
    }

    const total={found:0,inserted:0,updated:0,missing:0,unavailable:0,removed:0};
    const details={};
    for(const [source,incoming] of groups){
      const existing=await listListings(source,{discoveredVia:'brave_search'});
      const {rows,stats}=reconcileSnapshot(existing||[],incoming||[],{
        unavailableAfterMisses:intValue('BETEL_DISCOVERY_UNAVAILABLE_AFTER_MISSES',6),
        removeAfterHours:intValue('BETEL_DISCOVERY_REMOVE_AFTER_HOURS',336),
        keepActiveUntilUnavailable:true,
        now:new Date().toISOString()
      });
      const prepared=rows.map(row=>({
        ...row,
        discovered_via:'brave_search',
        verification_status:['unavailable','removed'].includes(row.availability_status)?'stale':'discovered'
      }));
      await upsertListings(prepared);
      details[source]=stats;
      sumStats(total,stats);
    }

    await finishSyncRun(run?.id,runPatch(total,'success',{metadata:{runner:'github-actions',provider:'brave_search',query_count:queries.length,queries,details}}));
    console.log(JSON.stringify({ok:true,provider:'brave_search',queries:queries.length,stats:total,details},null,2));
  }catch(error){
    const message=String(error?.stack||error?.message||error);
    console.error(message);
    try{await finishSyncRun(run?.id,runPatch(null,'error',{error_message:message.slice(0,4000),metadata:{provider:'brave_search'}}))}catch(logError){console.error('Falha ao registrar erro no Supabase:',logError)}
    process.exitCode=1;
  }
}

await main();
