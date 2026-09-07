/* Betel Radar v0.8.2 — dados reais como fonte principal, build 8223 */
(function(){
  const BUILD='8223';
  const MODE_KEY='betel_data_mode';
  const ENDPOINT_KEY='betel_sync_endpoint';
  const CACHE_KEY='betel_real_data_cache_v2';
  const USER_FIELDS=['status','followUp','followUpNote','activities','generatedHistory','messageHistory','proposalStatus','quoteValue','closedValue','paidValue','paymentStatus','commercialChannel','images','coverIndex','drone','pano','photos','quality'];
  const priorByKey=new Map();
  let decorateTimer=null;
  let canonical=[];
  let canonicalReady=false;
  let renderWrapped=false;
  let enforcing=false;
  let refreshPromise=null;

  function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
  function sourceName(v){const s=String(v||'').toLowerCase();if(s.includes('vivareal'))return 'Viva Real';if(s.includes('olx'))return 'OLX';return v||'Web'}
  function plainSource(o){return String(o?.portalSource||o?.source||'').toLowerCase().includes('vivareal')?'vivareal':String(o?.portalSource||o?.source||'').toLowerCase().includes('olx')?'olx':String(o?.portalSource||o?.source||'web').toLowerCase()}
  function keyOf(o){const src=plainSource(o);const ext=o?.externalId||o?.external_id||'';if(ext)return `${src}:${ext}`;if(o?.url||o?.sourceUrl)return `${src}:${o.url||o.sourceUrl}`;return `${src}:${o?.id||''}`}
  function stableId(o){const ext=String(o?.externalId||o?.external_id||'');if(/^\d{1,15}$/.test(ext)){const n=Number(ext);if(Number.isSafeInteger(n))return n}const text=keyOf(o);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)+1000000000}
  function typeLabel(o){const t=`${o?.propertyType||o?.property_type||''} ${o?.title||''}`.toLowerCase();if(t.includes('chácara')||t.includes('chacara'))return 'Chácara';if(t.includes('sítio')||t.includes('sitio'))return 'Sítio';if(t.includes('fazenda')||t.includes('farm'))return 'Fazenda';if(t.includes('lote'))return 'Lote';return 'Terreno'}
  function scoreFor(o){const area=num(o?.areaM2??o?.area_m2)||0;const type=typeLabel(o);let s=68;if(area>=50000)s+=24;else if(area>=10000)s+=20;else if(area>=5000)s+=16;else if(area>=2000)s+=13;else if(area>=1000)s+=10;else if(area>=500)s+=7;else if(area>0)s+=3;if(['Fazenda','Sítio','Chácara'].includes(type))s+=8;else s+=5;return Math.max(60,Math.min(100,s))}
  function locationLabel(o){const p=o?.geocodePrecision||o?.geocode_precision||'';if(p==='exact')return 'Localização exata informada';if(p==='address')return 'Localização aproximada — endereço';if(p==='neighborhood')return 'Localização aproximada — bairro/localidade';if(p==='city')return 'Localização aproximada — município';return (num(o?.latitude)!==null&&num(o?.longitude)!==null)?'Localização disponível':'Sem localização suficiente'}
  function meaningful(v){return v!==undefined&&v!==null&&v!==''}

  function capturePrior(list=window.opportunities){
    (Array.isArray(list)?list:[]).filter(o=>o&&o.sourceListing).forEach(o=>{
      const existing=priorByKey.get(keyOf(o))||{};
      const next={...existing};
      for(const field of USER_FIELDS){if(meaningful(o[field]))next[field]=o[field]}
      if(Array.isArray(o.tags))next.tags=o.tags;
      priorByKey.set(keyOf(o),next)
    })
  }

  function compatible(o){
    const src=plainSource(o),sourceLabel=sourceName(src),prior=priorByKey.get(keyOf(o));
    const price=num(o?.manualPrice??o?.manual_price??o?.price),area=num(o?.manualAreaM2??o?.manual_area_m2??o?.areaM2??o?.area_m2);
    const imgs=Array.isArray(o?.imageUrls)?o.imageUrls:(Array.isArray(o?.image_urls)?o.image_urls:[]);
    const verification=o?.verificationStatus||o?.verification_status||'discovered',discoveredVia=o?.discoveredVia||o?.discovered_via||'';
    const discoveryLabel=verification==='verified'?'Verificado pela fonte':(discoveredVia==='brave_search'?'Descoberto via Brave':'Descoberto na web');
    const latitude=num(o?.latitude),longitude=num(o?.longitude),hasCoords=latitude!==null&&longitude!==null,locLabel=locationLabel(o);
    const advertiser=o?.manualAdvertiser||o?.manual_advertiser||o?.advertiser||`${sourceLabel} · anunciante não identificado`;
    const fresh={
      ...o,id:stableId(o),externalId:o?.externalId||o?.external_id||'',portalSource:src,sourceListing:true,
      source:`${sourceLabel} · ${discoveredVia==='brave_search'?'Brave Search':'Pesquisa web'}`,sourceLabel,discoveryLabel,verificationStatus:verification,discoveredVia,
      url:o?.url||o?.sourceUrl||o?.source_url||'',title:o?.title||'Imóvel descoberto na web',city:o?.city||'',neighborhood:o?.neighborhood||'',addressText:o?.addressText||o?.address_text||'',
      advertiser,advertiserType:o?.advertiserType||o?.advertiser_type||'Não identificado',type:typeLabel(o),price,areaM2:area,coords:hasCoords?[latitude,longitude]:null,
      geocodeStatus:o?.geocodeStatus||o?.geocode_status||'',geocodePrecision:o?.geocodePrecision||o?.geocode_precision||'',geocodeSource:o?.geocodeSource||o?.geocode_source||'',
      geocodeLabel:o?.geocodeLabel||o?.geocode_label||'',geocodeQuery:o?.geocodeQuery||o?.geocode_query||'',geocodedAt:o?.geocodedAt||o?.geocoded_at||'',locationPrecisionLabel:locLabel,
      score:scoreFor(o),status:'Novo',drone:false,pano:false,photos:imgs.length,quality:'unknown',tags:[sourceLabel,discoveryLabel,'Visual não verificado',...(hasCoords?[locLabel]:[])],
      images:imgs,coverIndex:0,followUp:null,followUpNote:'',activities:[],generatedHistory:[],messageHistory:[],proposalStatus:'',quoteValue:0,closedValue:0,paidValue:0,paymentStatus:'',commercialChannel:sourceLabel
    };
    if(prior){for(const field of USER_FIELDS){if(meaningful(prior[field]))fresh[field]=prior[field]}const oldTags=Array.isArray(prior.tags)?prior.tags:[];fresh.tags=[...new Set([...fresh.tags,...oldTags])]}
    return fresh
  }

  function inventorySignature(list){
    return (Array.isArray(list)?list:[]).filter(o=>o?.sourceListing).map(o=>[
      keyOf(o),o.title||'',num(o.price),num(o.areaM2??o.area_m2),o.city||'',o.neighborhood||'',num(o.latitude??o.coords?.[0]),num(o.longitude??o.coords?.[1]),o.verificationStatus||o.verification_status||''
    ].join('|')).sort().join('||')
  }
  function syncLegacy(){try{window.eval('if (typeof opportunities !== "undefined") opportunities = window.opportunities')}catch{}}
  function saveCache(){try{localStorage.setItem(CACHE_KEY,JSON.stringify({build:BUILD,updatedAt:new Date().toISOString(),rows:canonical}))}catch{}}
  function loadCache(){try{const data=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return Array.isArray(data?.rows)?data.rows.filter(o=>o?.sourceListing):[]}catch{return []}}

  function applyCanonical(reason='authority',renderIfChanged=false){
    if(!canonicalReady||enforcing)return false;
    enforcing=true;
    try{
      capturePrior();
      canonical=canonical.map(compatible);
      const currentSig=inventorySignature(window.opportunities),canonicalSig=inventorySignature(canonical);
      const changed=currentSig!==canonicalSig;
      window.opportunities=canonical.map(o=>({...o}));
      syncLegacy();
      if(changed&&renderIfChanged)rerender();
      window.__BETEL_REAL_DATA__={build:BUILD,count:canonical.length,updatedAt:new Date().toISOString(),authority:reason};
      return changed
    }finally{enforcing=false}
  }

  function wrapRenderAll(){
    if(renderWrapped||typeof window.renderAll!=='function')return;
    const original=window.renderAll;
    if(original.__v082CanonicalWrapped){renderWrapped=true;return}
    const wrapped=function(){if(canonicalReady&&!enforcing)applyCanonical('before-render',false);return original.apply(this,arguments)};
    wrapped.__v082CanonicalWrapped=true;window.renderAll=wrapped;renderWrapped=true
  }

  function installStyles(){
    if(document.getElementById('v082RealDataStyles'))return;
    const s=document.createElement('style');s.id='v082RealDataStyles';s.textContent=`
      #v082SyncCard [data-v082-action="mode"],#v082SyncCard [data-v082-action="endpoint"]{display:none!important}
      #v082SyncCard .v082-actions{grid-template-columns:1fr!important}
      #v082SyncCard .v082-btn.primary{grid-column:1/-1!important}
      .v082-real-source-badge{display:inline-flex;align-items:center;margin-left:7px;padding:3px 7px;border-radius:999px;background:#f4eee5;color:#825a2e;font-size:9px;font-weight:800;line-height:1;vertical-align:middle;white-space:nowrap}
      @media(max-width:760px){.v082-real-source-badge{font-size:8px;padding:3px 6px;margin-left:5px}}
    `;document.head.appendChild(s)
  }
  function decorate(root=document){
    const ops=Array.isArray(window.opportunities)?window.opportunities.filter(o=>o?.sourceListing):[];if(!ops.length)return;
    const byTitle=new Map(ops.map(o=>[String(o.title||'').trim(),o])),scope=root&&root.querySelectorAll?root:document;
    scope.querySelectorAll('.v082-real-source-badge').forEach(b=>{const titleEl=b.previousElementSibling,title=titleEl?(titleEl.textContent||'').trim():'';if(!byTitle.has(title))b.remove()});
    scope.querySelectorAll('strong,h2,h3,h4,b').forEach(el=>{if(el.closest('#v082SyncCard,#v082SourceDetailPanel'))return;const op=byTitle.get((el.textContent||'').trim());if(!op)return;const parent=el.parentElement;if(!parent)return;const label=op.sourceLabel+(op.discoveredVia==='brave_search'?' · Brave':' · Web');let badge=parent.querySelector(':scope > .v082-real-source-badge');if(!badge){badge=document.createElement('span');badge.className='v082-real-source-badge';parent.insertBefore(badge,el.nextSibling)}badge.textContent=label;badge.title=op.discoveryLabel})
  }
  function scheduleDecorate(delay=90){clearTimeout(decorateTimer);decorateTimer=setTimeout(()=>{installStyles();decorate(document)},delay)}
  function rerender(){wrapRenderAll();if(typeof window.renderAll==='function'){try{window.renderAll()}catch(e){console.warn('Betel Radar: falha ao renderizar dados reais',e)}scheduleDecorate(110)}else scheduleDecorate(110)}

  function handleSynced(e){
    const detail=e?.detail||{};if(detail.mode&&detail.mode!=='production')return;
    capturePrior();
    const rows=Array.isArray(detail.all)?detail.all:(Array.isArray(window.opportunities)?window.opportunities:[]);
    const active=rows.filter(o=>(o.availabilityStatus||o.availability_status||'active')==='active');
    canonical=active.map(compatible);canonicalReady=true;saveCache();applyCanonical('source-listings',false);rerender();
    window.dispatchEvent(new CustomEvent('betel:real-data-ready',{detail:{count:canonical.length,build:BUILD}}))
  }
  function forceProduction(){localStorage.setItem(MODE_KEY,'production');localStorage.removeItem(ENDPOINT_KEY);const sync=window.BetelRadarSync;if(sync?.state&&sync.state.mode!=='production')sync.setMode?.('production')}
  function requestFresh(reason='refresh'){
    forceProduction();const sync=window.BetelRadarSync;if(!sync?.syncNow||refreshPromise)return refreshPromise;
    refreshPromise=Promise.resolve(sync.syncNow()).catch(e=>console.warn('Betel Radar: atualização da base atual falhou',e)).finally(()=>{refreshPromise=null});
    return refreshPromise
  }
  function scheduleAuthority(reason='scheduled'){
    [40,180,520,1100].forEach((ms,i)=>setTimeout(()=>{wrapRenderAll();applyCanonical(`${reason}:${i}`,true)},ms))
  }

  capturePrior();installStyles();localStorage.setItem(MODE_KEY,'production');localStorage.removeItem(ENDPOINT_KEY);
  const cached=loadCache();if(cached.length){canonical=cached.map(compatible);canonicalReady=true;applyCanonical('local-cache',false);setTimeout(rerender,40)}
  window.addEventListener('betel:opportunities-synced',handleSynced);
  window.addEventListener('betel:real-data-ready',()=>scheduleDecorate(80));
  window.addEventListener('pageshow',()=>{capturePrior();forceProduction();wrapRenderAll();scheduleAuthority('pageshow');setTimeout(()=>requestFresh('pageshow'),260)});
  window.addEventListener('focus',()=>scheduleAuthority('focus'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){scheduleAuthority('visible');setTimeout(()=>requestFresh('visible'),220)}});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-v082-action="sync"]'))capturePrior();
    if(e.target.closest?.('.nav-item,.bottom-nav,.mobile-bottom-nav,[data-section],[onclick*="showSection"],[onclick*="navigate"],#syncNowBtn,[onclick*="sync"]')){scheduleAuthority('navigation');scheduleDecorate(180)}
  },true);
  setInterval(()=>{if(!document.hidden&&canonicalReady){const changed=inventorySignature(window.opportunities)!==inventorySignature(canonical);if(changed)applyCanonical('watchdog',true);else syncLegacy()}},400);
  setTimeout(()=>{forceProduction();wrapRenderAll();requestFresh('boot')},180);
  setTimeout(()=>{if(!renderWrapped)wrapRenderAll();scheduleAuthority('boot-late')},850);
  scheduleDecorate(900);
  window.__BETEL_REAL_DATA_AUTHORITY__={build:BUILD,enforce:()=>applyCanonical('manual',true),refresh:()=>requestFresh('manual'),get count(){return canonical.length},get ready(){return canonicalReady}};
})();
