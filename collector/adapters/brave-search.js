import {createHash} from 'node:crypto';

const API_URL='https://api.search.brave.com/res/v1/web/search';
const DEFAULT_DOMAINS=['olx.com.br','vivareal.com.br'];
const DEFAULT_GROUPS=[
  '"Lauro de Freitas" BA',
  '"Camaçari" BA',
  '"Mata de São João" BA',
  '("Simões Filho" OR "Dias d\'Ávila" OR "Pojuca") BA'
];
const TERMS='(terreno OR lote OR sítio OR sitio OR chácara OR chacara OR fazenda)';

function env(name,fallback=''){
  return (process.env[name]??fallback).toString().trim();
}
function csv(name,fallback){
  return env(name,fallback).split(',').map(x=>x.trim()).filter(Boolean);
}
function cleanText(value=''){
  return String(value).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function normalizeNumber(text){
  if(!text)return null;
  const s=String(text).replace(/\./g,'').replace(',','.').replace(/[^0-9.]/g,'');
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function escRx(v=''){return String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
export function extractPrice(text){
  const m=String(text||'').match(/R\$\s*([0-9][0-9.,]*)/i);
  return m?normalizeNumber(m[1]):null;
}
export function extractArea(text){
  const m=String(text||'').match(/([0-9][0-9.,]*)\s*(?:m(?:²|2)|metros?\s+quadrados?)/i);
  return m?normalizeNumber(m[1]):null;
}
function inferPropertyType(text){
  const t=String(text||'').toLowerCase();
  if(t.includes('fazenda'))return 'farm';
  if(t.includes('sítio')||t.includes('sitio'))return 'rural_property';
  if(t.includes('chácara')||t.includes('chacara'))return 'rural_property';
  return 'land';
}
function inferCity(text,fallback=''){
  const t=String(text||'').toLowerCase();
  const cities=['Lauro de Freitas','Camaçari','Mata de São João','Simões Filho',"Dias d'Ávila",'Pojuca','São Francisco do Conde','Candeias','Salvador'];
  return cities.find(c=>t.includes(c.toLowerCase()))||fallback.replace(/["()]/g,'').replace(/\s+BA$/i,'').split(/\s+OR\s+/i)[0].trim();
}
function inferLocationHints(title,description,city){
  const text=`${title||''} ${description||''}`.replace(/\s+/g,' ').trim();
  let neighborhood='';let address='';
  const road=text.match(/\b(?:BA-\d{3}|BR-\d{3})(?:\s*,?\s*(?:km\s*)?\d+(?:[.,]\d+)?)?/i)
    ||text.match(/\b(?:Rua|R\.|Avenida|Av\.?|Travessa|Alameda|Estrada|Rodovia)\s+[^|;]{3,70}/i);
  if(road)address=road[0].replace(/\s+-\s+.*$/,'').trim();
  if(city){
    const cityRx=escRx(city);
    const olx=title.match(new RegExp(`-\\s*([^|,-]{2,70}(?:\\([^)]{2,40}\\))?)\\s*,\\s*${cityRx}\\b`,'i'));
    const viva=title.match(new RegExp(`\\bem\\s+([^,|-]{2,45})\\s+em\\s+${cityRx}\\b`,'i'));
    const raw=(olx?.[1]||viva?.[1]||'').trim();
    if(raw&&!/terrenos?|s[ií]tios?|fazendas?|ch[aá]caras?|venda|im[oó]vel/i.test(raw))neighborhood=raw;
  }
  return {neighborhood,address}
}
function sourceFromUrl(url){
  const host=new URL(url).hostname.toLowerCase();
  if(host.endsWith('olx.com.br'))return 'olx';
  if(host.endsWith('vivareal.com.br'))return 'vivareal';
  return host.replace(/^www\./,'');
}
function externalId(url,source){
  const u=new URL(url);let m=null;
  if(source==='olx')m=u.pathname.match(/-(\d{8,})\/?$/);
  if(source==='vivareal')m=u.pathname.match(/id-(\d+)\/?$/);
  if(m)return m[1];
  return createHash('sha256').update(url).digest('hex').slice(0,24);
}
function isDirectListing(url,source){
  const u=new URL(url);
  if(source==='olx')return /-(\d{8,})\/?$/.test(u.pathname);
  if(source==='vivareal')return u.pathname.includes('/imovel/')&&/id-(\d+)/.test(u.pathname);
  return false;
}
function looksUnavailable(text=''){
  return /\b(an[uú]ncio\s+(?:n[aã]o\s+)?(?:dispon[ií]vel|encontrado|removido|expirado)|im[oó]vel\s+(?:n[aã]o\s+)?dispon[ií]vel|p[aá]gina\s+n[aã]o\s+encontrada|404|conte[uú]do\s+indispon[ií]vel)\b/i.test(String(text));
}

async function braveSearch(query,key,count){
  const params=new URLSearchParams({q:query,count:String(count),country:'BR',search_lang:'pt-br',ui_lang:'pt-BR',spellcheck:'1'});
  const response=await fetch(`${API_URL}?${params}`,{
    headers:{Accept:'application/json','Accept-Encoding':'gzip','X-Subscription-Token':key},
    cache:'no-store'
  });
  const text=await response.text();
  if(!response.ok)throw new Error(`Brave Search HTTP ${response.status}: ${text.slice(0,500)}`);
  const payload=text?JSON.parse(text):{};
  return Array.isArray(payload?.web?.results)?payload.web.results:[];
}

export function normalizeBraveResult(result,{query,group,rank}={}){
  const url=String(result?.url||'').trim();
  if(!url)return null;
  let source;
  try{source=sourceFromUrl(url)}catch{return null}
  if(!isDirectListing(url,source))return null;
  const title=cleanText(result?.title)||'Imóvel descoberto na web';
  const description=cleanText(result?.description||result?.profile?.long_name||'');
  const combined=`${title} ${description}`;
  if(looksUnavailable(combined))return null;
  const city=inferCity(combined,group);
  const hints=inferLocationHints(title,description,city);
  return {
    source,
    external_id:externalId(url,source),
    source_url:url,
    title,
    description,
    advertiser:'',
    advertiser_type:source==='vivareal'?'professional':null,
    listing_type:'sale',
    property_type:inferPropertyType(combined),
    price:extractPrice(combined),
    city,
    state:'BA',
    ...(hints.neighborhood?{neighborhood:hints.neighborhood}:{}),
    ...(hints.address?{address_text:hints.address}:{}),
    area_m2:extractArea(combined),
    image_urls:[],
    availability_status:'active',
    discovered_via:'brave_search',
    verification_status:'discovered',
    discovery_query:query,
    source_rank:rank||null,
    raw_payload:{provider:'brave_search',query,title:result?.title||'',description:result?.description||'',age:result?.age||null,language:result?.language||null}
  };
}

export async function fetchBraveDiscovery(){
  const key=env('BRAVE_SEARCH_API_KEY');
  if(!key)throw new Error('BRAVE_SEARCH_API_KEY não configurada');
  const domains=csv('BETEL_DISCOVERY_DOMAINS',DEFAULT_DOMAINS.join(','));
  const groups=csv('BETEL_DISCOVERY_GROUPS',DEFAULT_GROUPS.join(','));
  const count=Math.min(20,Math.max(1,Number(env('BETEL_DISCOVERY_RESULTS_PER_QUERY','20'))||20));
  const rows=[];const seen=new Set();const queries=[];
  for(const domain of domains){
    for(const group of groups){
      const query=`site:${domain} ${TERMS} ${group}`;
      queries.push(query);
      const results=await braveSearch(query,key,count);
      results.forEach((result,index)=>{
        const row=normalizeBraveResult(result,{query,group,rank:index+1});
        if(!row)return;const k=`${row.source}:${row.external_id}`;
        if(seen.has(k))return;seen.add(k);rows.push(row);
      });
    }
  }
  return {listings:rows,queries};
}
