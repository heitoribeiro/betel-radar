function env(name,required=true){
  const value=(process.env[name]||'').trim();
  if(required&&!value)throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function supabaseSecret(){
  const modern=env('SUPABASE_SECRET_KEY',false);
  const legacy=env('SUPABASE_SERVICE_ROLE_KEY',false);
  const key=modern||legacy;
  if(!key)throw new Error('Variável obrigatória ausente: SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY legado)');
  return key;
}

function validateEnv(){
  env('SUPABASE_URL');
  supabaseSecret();
}

function baseHeaders(){
  const key=supabaseSecret();
  return {
    apikey:key,
    Authorization:`Bearer ${key}`,
    'Content-Type':'application/json'
  };
}

async function request(path,{method='GET',body,prefer}={}){
  validateEnv();
  const url=`${env('SUPABASE_URL').replace(/\/$/,'')}${path}`;
  const headers=baseHeaders();
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  if(!response.ok)throw new Error(`Supabase ${method} ${path}: HTTP ${response.status} ${text.slice(0,500)}`);
  if(!text)return null;
  try{return JSON.parse(text)}catch{return text}
}

export async function listListings(source,{discoveredVia,verificationStatus}={}){
  const params=new URLSearchParams({source:`eq.${source}`,select:'*'});
  if(discoveredVia)params.set('discovered_via',`eq.${discoveredVia}`);
  if(verificationStatus)params.set('verification_status',`eq.${verificationStatus}`);
  return await request(`/rest/v1/source_listings?${params}`);
}

export async function listActiveListings(){
  const params=new URLSearchParams({availability_status:'eq.active',select:'*',order:'last_seen_at.desc'});
  return await request(`/rest/v1/source_listings?${params}`);
}

export async function createSyncRun(source,metadata={}){
  const rows=await request('/rest/v1/sync_runs',{method:'POST',prefer:'return=representation',body:[{source,status:'running',metadata}]});
  return rows?.[0]||null;
}

export async function finishSyncRun(id,patch){
  if(!id)return;
  await request(`/rest/v1/sync_runs?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:{...patch,finished_at:new Date().toISOString()}});
}

const DB_FIELDS=new Set([
  'source','external_id','source_url','title','description','advertiser','advertiser_type','listing_type','property_type','price','condominium_fee','iptu','city','state','neighborhood','address_text','latitude','longitude','bedrooms','bathrooms','parking_spaces','area_m2','image_urls','raw_payload','availability_status','first_seen_at','last_seen_at','missing_since','unavailable_at','removed_at','consecutive_misses','content_hash','discovered_via','verification_status','discovery_query','discovered_at','last_verified_at','source_rank','geocode_status','geocode_precision','geocode_source','geocode_query','geocode_label','geocode_confidence','geocoded_at','location_signature'
]);

export function toDbRow(row){
  const out={};
  for(const [key,value] of Object.entries(row||{}))if(DB_FIELDS.has(key)&&value!==undefined)out[key]=value;
  if(!out.raw_payload)out.raw_payload={};
  if(!Array.isArray(out.image_urls))out.image_urls=[];
  return out;
}

export async function upsertListings(rows,{chunkSize=200}={}){
  const clean=(rows||[]).map(toDbRow);
  for(let i=0;i<clean.length;i+=chunkSize){
    const chunk=clean.slice(i,i+chunkSize);
    await request('/rest/v1/source_listings?on_conflict=source,external_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:chunk});
  }
  return clean.length;
}
