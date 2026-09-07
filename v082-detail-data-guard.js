/* Betel Radar v0.8.2 — guarda de contexto e dados da ficha, build 8222 */
(function(){
  const BUILD='8222';
  const SUPABASE_URL='https://asnjlaxhbehzhisandmz.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_JCp12LZjTSgH7mi-X-eOvg_hILh1fb3';
  const rowCache=new Map();
  let refreshPromise=null;
  let observerTimer=null;
  let enforcing=false;

  function norm(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function rendered(el){if(!el||!(el instanceof Element))return false;const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&cs.opacity!=='0'&&el.getClientRects().length>0}
  function closeSelector(){return '[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]'}
  function allOps(){return (Array.isArray(window.opportunities)?window.opportunities:[]).filter(o=>o?.sourceListing)}
  function sourceKey(op){const s=String(op?.portalSource||op?.sourceLabel||op?.source||'').toLowerCase();return s.includes('viva')?'vivareal':s.includes('olx')?'olx':s.replace(/\s.+$/,'')}
  function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
  function money(v){const n=num(v);return n===null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}

  function detailRoot(){
    const labels=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p,small,strong,b')].filter(el=>rendered(el)&&/^ficha da oportunidade$/i.test(norm(el.textContent)));
    let best=null,bestScore=-Infinity;
    for(const label of labels){
      let el=label;
      for(let i=0;i<8&&el&&el!==document.body;i++,el=el.parentElement){
        if(!rendered(el)||!el.querySelector(closeSelector()))continue;
        const r=el.getBoundingClientRect();if(r.width<Math.min(280,innerWidth*.65)||r.height<220)continue;
        let score=0;
        if(/histórico/i.test(norm(el.textContent)))score+=40;
        if(/mensagens registradas/i.test(norm(el.textContent)))score+=25;
        if(/overlay|backdrop/i.test(`${el.id||''} ${el.className||''}`))score-=80;
        const cs=getComputedStyle(el);if((parseFloat(cs.borderTopLeftRadius)||0)>=12)score+=20;
        if(r.width<=innerWidth*1.05)score+=15;
        if(score>bestScore){best=el;bestScore=score}
      }
    }
    return best
  }

  function resolveOp(root){
    if(!root)return null;
    const list=allOps();if(!list.length)return null;
    const exact=new Map(list.map(o=>[norm(o.title),o]));
    const candidates=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b')].filter(el=>!el.closest('#v082SourceDetailPanel,#v082ProspectingPanel'));
    for(const el of candidates){const op=exact.get(norm(el.textContent));if(op)return op}
    const text=norm(root.textContent);
    const extMatches=list.filter(o=>String(o.externalId||o.external_id||'')&&text.includes(String(o.externalId||o.external_id))).sort((a,b)=>String(b.externalId||b.external_id).length-String(a.externalId||a.external_id).length);
    if(extMatches.length)return extMatches[0];
    const titleMatches=list.filter(o=>norm(o.title)&&text.includes(norm(o.title))).sort((a,b)=>norm(b.title).length-norm(a.title).length);
    return titleMatches[0]||null
  }

  function syncLegacy(){try{window.eval('if (typeof opportunities !== "undefined") opportunities = window.opportunities');return true}catch{return false}}

  async function refreshActive(){
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{try{await window.BetelRadarSync?.syncNow?.()}catch{}syncLegacy()})().finally(()=>{refreshPromise=null});
    return refreshPromise
  }

  async function fetchRow(op,force=false){
    if(!op)return null;const src=sourceKey(op),ext=String(op.externalId||op.external_id||'');if(!src||!ext)return null;
    const k=`${src}:${ext}`,cached=rowCache.get(k);if(!force&&cached&&Date.now()-cached.at<30000)return cached.row;
    const q=`${SUPABASE_URL}/rest/v1/source_listings?source=eq.${encodeURIComponent(src)}&external_id=eq.${encodeURIComponent(ext)}&availability_status=eq.active&select=*`;
    const r=await fetch(q,{headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${PUBLISHABLE_KEY}`,Accept:'application/json'},cache:'no-store'});if(!r.ok)return null;
    const rows=await r.json(),row=Array.isArray(rows)?rows[0]:null;rowCache.set(k,{at:Date.now(),row});return row||null
  }

  function applyRow(op,row){
    if(!op||!row)return false;
    const before=[op.price,op.areaM2,op.advertiser,op.city,op.neighborhood,op.latitude,op.longitude,op.updatedAt].join('|');
    const sourcePrice=num(row.price),manualPrice=num(row.manual_price),sourceArea=num(row.area_m2),manualArea=num(row.manual_area_m2);
    op.sourcePrice=sourcePrice;op.manualPrice=manualPrice;op.price=manualPrice!==null?manualPrice:sourcePrice;
    op.sourceAreaM2=sourceArea;op.manualAreaM2=manualArea;op.areaM2=manualArea!==null?manualArea:sourceArea;
    op.sourceAdvertiser=row.advertiser||'';op.manualAdvertiser=row.manual_advertiser||'';op.advertiser=op.manualAdvertiser||op.sourceAdvertiser||op.advertiser;
    op.city=row.city||op.city||'';op.neighborhood=row.neighborhood||op.neighborhood||'';op.addressText=row.address_text||op.addressText||'';
    op.latitude=num(row.latitude);op.longitude=num(row.longitude);op.coords=op.latitude!==null&&op.longitude!==null?[op.latitude,op.longitude]:null;
    op.geocodeStatus=row.geocode_status||op.geocodeStatus||'';op.geocodePrecision=row.geocode_precision||op.geocodePrecision||'';op.geocodeLabel=row.geocode_label||op.geocodeLabel||'';
    op.firstSeen=row.first_seen_at||op.firstSeen||'';op.lastSeen=row.last_seen_at||op.lastSeen||'';op.updatedAt=row.updated_at||op.updatedAt||'';
    op.url=row.source_url||op.url||'';op.discoveredVia=row.discovered_via||op.discoveredVia||'';op.verificationStatus=row.verification_status||op.verificationStatus||'discovered';
    return before!==[op.price,op.areaM2,op.advertiser,op.city,op.neighborhood,op.latitude,op.longitude,op.updatedAt].join('|')
  }

  function setField(root,label,value){
    if(!root)return false;
    const labels=[...root.querySelectorAll('small,span,div,p')].filter(el=>!el.closest('#v082SourceDetailPanel,#v082ProspectingPanel')&&norm(el.textContent).toLowerCase()===label.toLowerCase());
    for(const lab of labels){
      let box=lab.parentElement;if(!box)continue;
      for(let i=0;i<3&&box&&box!==root;i++,box=box.parentElement){
        const values=[...box.querySelectorAll('b,strong,h3,h4,div,span,p')].filter(el=>el!==lab&&!el.contains(lab)&&!el.closest('#v082SourceDetailPanel,#v082ProspectingPanel')&&norm(el.textContent)&&norm(el.textContent).toLowerCase()!==label.toLowerCase());
        const target=values.find(el=>el.children.length===0)||values[0];
        if(target){target.textContent=value;return true}
      }
    }
    return false
  }

  function refreshBaseFields(root,op){
    setField(root,'Preço',money(op.price));
    if(op.city)setField(root,'Local',op.city);
    if(op.advertiser)setField(root,'Anunciante',op.advertiser)
  }

  async function enforce(reason='manual',forceRow=false){
    if(enforcing)return false;enforcing=true;
    try{
      let root=detailRoot();if(!root)return false;
      let op=resolveOp(root);
      if(!op){
        await refreshActive();root=detailRoot();if(!root)return false;op=resolveOp(root);
        if(!op){document.querySelectorAll('#v082SourceDetailPanel,#v082ProspectingPanel').forEach(el=>el.remove());try{window.closeDetail?.()}catch{}return false}
      }
      root.dataset.v082OpportunityId=String(op.id);
      const oldSource=document.getElementById('v082SourceDetailPanel');
      if(oldSource&&String(oldSource.dataset.v082OpId||'')!==String(op.id)){document.getElementById('v082ProspectingPanel')?.remove();oldSource.remove()}

      const row=await fetchRow(op,forceRow);
      root=detailRoot();const current=resolveOp(root);if(!root||!current||String(current.id)!==String(op.id))return false;
      let changed=false;
      if(row){changed=applyRow(op,row);syncLegacy();refreshBaseFields(root,op)}

      const panel=document.getElementById('v082SourceDetailPanel');
      const panelWrong=!panel||String(panel.dataset.v082OpId||'')!==String(op.id);
      if(panelWrong||changed){try{window.__BETEL_DETAIL_ENRICHMENT__?.inject?.(op.id)}catch{}}
      const prospect=document.getElementById('v082ProspectingPanel');if(prospect&&String(prospect.dataset.v082OpId||'')!==String(op.id))prospect.remove();
      try{window.__BETEL_DETAIL_LAYOUT_FIX__?.repair?.()}catch{}
      window.__BETEL_DETAIL_DATA_GUARD__={build:BUILD,reason,opId:op.id,source:sourceKey(op),externalId:String(op.externalId||op.external_id||''),price:op.price,changed,updatedAt:new Date().toISOString()};
      return true
    }finally{enforcing=false}
  }

  function schedule(reason='scheduled'){[35,120,300,650,1100].forEach((ms,i)=>setTimeout(()=>enforce(`${reason}:${i}`,i===3),ms))}

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[onclick*="openDetail"],.opportunity-card,.radar-card,.visual-card,.kanban-card,.map-popup button,article,.card'))schedule('open');
    if(e.target.closest?.('[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]'))setTimeout(()=>{document.querySelectorAll('#v082SourceDetailPanel,#v082ProspectingPanel').forEach(el=>el.remove())},120)
  },true);
  window.addEventListener('betel:detail-context',()=>setTimeout(()=>enforce('detail-context'),60));
  window.addEventListener('betel:real-data-ready',()=>setTimeout(()=>enforce('real-data-ready',true),180));
  window.addEventListener('pageshow',()=>setTimeout(()=>{syncLegacy();enforce('pageshow',true)},650));

  const observer=new MutationObserver(()=>{if(observerTimer)return;observerTimer=setTimeout(()=>{observerTimer=null;if(detailRoot())enforce('mutation')},180)});
  const start=()=>observer.observe(document.body,{childList:true,subtree:true});if(document.body)start();else window.addEventListener('DOMContentLoaded',start,{once:true});
  setTimeout(()=>{syncLegacy();enforce('boot',true)},1200);
})();
