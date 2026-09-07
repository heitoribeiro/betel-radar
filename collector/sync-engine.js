/* Betel Radar v0.8.2 — motor de reconciliação de anúncios
 * Independente da fonte. O adaptador entrega um snapshot e este motor
 * decide o ciclo active -> missing -> unavailable -> removed.
 */

export const DEFAULT_POLICY={
  unavailableAfterMisses:2,
  removeAfterHours:168,
  keepActiveUntilUnavailable:false
};

export function listingKey(row){
  if(!row?.source||!row?.external_id)throw new Error('source e external_id são obrigatórios');
  return `${row.source}:${row.external_id}`;
}

export function normalizeIncoming(row,now=new Date().toISOString()){
  return {
    ...row,
    source:String(row.source||'olx').toLowerCase(),
    external_id:String(row.external_id||''),
    title:String(row.title||'Imóvel sem título'),
    availability_status:'active',
    last_seen_at:now,
    missing_since:null,
    unavailable_at:null,
    removed_at:null,
    consecutive_misses:0
  };
}

export function reconcileSnapshot(existingRows,incomingRows,options={}){
  const policy={...DEFAULT_POLICY,...options};
  const now=options.now||new Date().toISOString();
  const existing=new Map((existingRows||[]).map(x=>[listingKey(x),{...x}]));
  const incoming=new Map((incomingRows||[]).map(x=>[listingKey(x),normalizeIncoming(x,now)]));
  const result=[];
  const stats={found:incoming.size,inserted:0,updated:0,missing:0,unavailable:0,removed:0};

  for(const [key,row] of incoming){
    const old=existing.get(key);
    if(!old){
      result.push({...row,first_seen_at:row.first_seen_at||now});
      stats.inserted++;
      continue;
    }
    result.push({...old,...row,first_seen_at:old.first_seen_at||now});
    stats.updated++;
    existing.delete(key);
  }

  for(const old of existing.values()){
    if(old.availability_status==='removed'){
      result.push(old);continue;
    }
    const misses=(Number(old.consecutive_misses)||0)+1;
    let status=policy.keepActiveUntilUnavailable?'active':'missing';
    let missingSince=old.missing_since||now;
    let unavailableAt=old.unavailable_at||null;
    let removedAt=old.removed_at||null;

    if(misses>=policy.unavailableAfterMisses){
      status='unavailable';
      unavailableAt=unavailableAt||now;
      stats.unavailable++;
    }else stats.missing++;

    if(unavailableAt){
      const hours=(new Date(now)-new Date(unavailableAt))/36e5;
      if(hours>=policy.removeAfterHours){
        status='removed';
        removedAt=removedAt||now;
        stats.removed++;
      }
    }

    result.push({...old,availability_status:status,consecutive_misses:misses,missing_since:missingSince,unavailable_at:unavailableAt,removed_at:removedAt});
  }

  return {rows:result,stats,run:{status:'success',started_at:now,finished_at:now,...stats}};
}
