/* Betel Radar v0.8.2 — camada de sincronização build 8209 */
(function(){
  const VERSION='v0.8.2';
  const KEY_MODE='betel_data_mode';
  const KEY_ENDPOINT='betel_sync_endpoint';
  const KEY_LAST='betel_sync_last';
  const DEFAULT_INTERVAL_MINUTES=60;
  const PANEL_SECTIONS=['Dashboard','Configurações'];
  const BETEL_CLOUD_URL='https://asnjlaxhbehzhisandmz.supabase.co';
  const BETEL_CLOUD_KEY='sb_publishable_JCp12LZjTSgH7mi-X-eOvg_hILh1fb3';
  const DEFAULT_LISTINGS_ENDPOINT=`${BETEL_CLOUD_URL}/rest/v1/source_listings?availability_status=eq.active&select=*&order=last_seen_at.desc`;
  const DEMO_OPPORTUNITIES=Array.isArray(window.opportunities)?[...window.opportunities]:[];

  const state={
    mode:localStorage.getItem(KEY_MODE)||'demo',
    endpoint:localStorage.getItem(KEY_ENDPOINT)||'',
    intervalMinutes:DEFAULT_INTERVAL_MINUTES,
    lastSync:localStorage.getItem(KEY_LAST)||'',
    status:'idle',active:0,unavailable:0,error:'',mobileOpen:false
  };
  let rendering=false,queued=false,booted=false;

  function fmtDate(v){if(!v)return 'Nunca';const d=new Date(v);return isNaN(d)?'Nunca':d.toLocaleString('pt-BR')}
  function activeEndpoint(){return state.endpoint||DEFAULT_LISTINGS_ENDPOINT}
  function normalizeListing(x){
    const verificationStatus=x.verification_status||x.verificationStatus||'verified';
    return {
      id:x.id||`${x.source||'source'}:${x.external_id||x.externalId||crypto.randomUUID()}`,
      source:x.source||'olx',
      externalId:x.external_id||x.externalId||'',
      title:x.title||'Imóvel sem título',
      description:x.description||'',
      advertiser:x.advertiser||'',
      advertiserType:x.advertiser_type||x.advertiserType||'',
      city:x.city||'',state:x.state||'',neighborhood:x.neighborhood||'',
      price:x.price??null,
      propertyType:x.property_type||x.propertyType||'',
      listingType:x.listing_type||x.listingType||'',
      bedrooms:x.bedrooms??null,bathrooms:x.bathrooms??null,
      parkingSpaces:x.parking_spaces??x.parkingSpaces??null,
      areaM2:x.area_m2??x.areaM2??null,
      latitude:x.latitude??null,longitude:x.longitude??null,
      url:x.source_url||x.url||'',
      imageUrls:Array.isArray(x.image_urls)?x.image_urls:(Array.isArray(x.imageUrls)?x.imageUrls:[]),
      firstSeen:x.first_seen_at||x.firstSeen||'',lastSeen:x.last_seen_at||x.lastSeen||'',
      availabilityStatus:x.availability_status||x.availabilityStatus||'active',
      discoveredVia:x.discovered_via||x.discoveredVia||'',
      verificationStatus,
      status:verificationStatus==='discovered'?'Descoberto':'Novo',
      sourceListing:true
    }
  }

  function installStyles(){
    if(document.getElementById('v082SyncStyles'))return;
    const s=document.createElement('style');s.id='v082SyncStyles';s.textContent=`
      #v082SyncCard{position:relative!important;inset:auto!important;transform:none!important;float:none!important;clear:both!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;z-index:1!important;grid-column:1/-1!important}
      .v082-sync-card{margin:16px 0 20px;padding:14px 16px;border:1px solid #e7e4df;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(20,20,20,.045);overflow:hidden}
      .v082-sync-card.v082-dashboard{margin:0 0 18px;padding:12px 16px}
      .v082-sync-head{display:flex;justify-content:space-between;align-items:center;gap:14px;min-width:0}.v082-sync-heading{min-width:0}.v082-sync-title{font-weight:800;font-size:14px;color:#171717}.v082-sync-sub{font-size:11px;color:#777;margin-top:2px}.v082-head-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.v082-badge{font-size:10px;font-weight:800;padding:5px 8px;border-radius:999px;background:#f1eee9;color:#72563b;white-space:nowrap}.v082-badge.ok{background:#e8f7ef;color:#177a52}.v082-badge.warn{background:#fff4da;color:#946400}.v082-badge.err{background:#fde9ec;color:#a52e3e}.v082-mobile-toggle{display:none;border:1px solid #dedad4;background:#fff;border-radius:9px;padding:6px 9px;font:inherit;font-size:10px;font-weight:800;cursor:pointer;touch-action:manipulation}
      .v082-body{display:block}.v082-dashboard .v082-body{display:none}.v082-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.v082-kpi{min-width:0;padding:10px 11px;border-radius:12px;border:1px solid #ece8e2;background:#fafafa}.v082-kpi small{display:block;color:#858585;font-size:10px;line-height:1.15}.v082-kpi b{display:block;font-size:16px;line-height:1.15;margin-top:4px;color:#181818}.v082-kpi .v082-date{font-size:11px;white-space:normal}
      .v082-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}.v082-btn{appearance:none;border:1px solid #dedad4;background:#fff;border-radius:10px;padding:8px 11px;font:inherit;font-size:11px;font-weight:800;line-height:1.15;cursor:pointer;white-space:nowrap;touch-action:manipulation}.v082-btn.primary{background:#171717;color:#fff;border-color:#171717}.v082-details{margin-top:10px;border-top:1px solid #eeeae4;padding-top:8px}.v082-details summary{cursor:pointer;font-size:10px;font-weight:700;color:#777;list-style:none}.v082-details summary::-webkit-details-marker{display:none}.v082-details summary:before{content:'＋ ';font-weight:900}.v082-details[open] summary:before{content:'− '}.v082-note{font-size:10px;color:#777;margin-top:7px;line-height:1.45}
      @media(min-width:761px){.v082-config{margin-top:18px!important}.v082-config .v082-sync-head{padding-bottom:2px}}
      @media(max-width:760px){
        .v082-sync-card,.v082-sync-card.v082-dashboard{margin:10px 0 12px;padding:10px 11px;border-radius:13px;box-shadow:none}
        .v082-sync-head{gap:7px}.v082-sync-title{font-size:11px}.v082-sync-sub{font-size:8px;line-height:1.25}.v082-head-actions{gap:5px}.v082-badge{font-size:8px;padding:4px 6px}.v082-mobile-toggle{display:inline-block}
        .v082-body,.v082-dashboard .v082-body{display:none}.v082-sync-card.v082-open .v082-body{display:block}
        .v082-grid{grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.v082-kpi{padding:8px}.v082-kpi small{font-size:8px}.v082-kpi b{font-size:13px}.v082-kpi .v082-date{font-size:9px}
        .v082-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.v082-btn{width:100%;padding:8px 6px;font-size:9px;white-space:normal}.v082-btn.primary{grid-column:1/-1}.v082-details{margin-top:7px;padding-top:6px}.v082-note,.v082-details summary{font-size:8px}
      }
      @media(max-width:380px){.v082-actions{grid-template-columns:1fr}.v082-btn.primary{grid-column:auto}}
    `;document.head.appendChild(s)
  }

  function sourceStatus(){if(state.mode==='demo')return ['DEMO','warn'];if(state.status==='syncing')return ['Sincronizando','warn'];if(state.status==='error')return ['Erro','err'];if(state.status==='success')return ['Dados reais','ok'];return ['PRODUÇÃO','ok']}
  function labels(){return ['Dashboard','Radar','Radar Visual','Mapa','Contatos','CRM','Agenda','Financeiro','Mensagens IA','Configurações']}
  function currentSection(){
    const active=document.querySelector('.nav-item.active,[aria-current="page"]');
    if(active){const t=(active.textContent||'').trim().replace(/\s+/g,' ');const hit=labels().find(x=>t===x||t.endsWith(x));if(hit)return hit}
    const hs=[...document.querySelectorAll('h1,h2,h3')].filter(e=>e.offsetParent!==null);
    for(const label of labels()){if(hs.some(h=>(h.textContent||'').trim().toLowerCase().includes(label.toLowerCase())))return label}
    return ''
  }

  function sectionHeading(section){return [...document.querySelectorAll('h1,h2,h3')].find(e=>e.offsetParent!==null&&(e.textContent||'').trim().toLowerCase().includes(section.toLowerCase()))||null}
  function contentRoot(heading){
    if(!heading)return null;
    const candidates=[];let n=heading.parentElement;
    while(n&&n!==document.body){const r=n.getBoundingClientRect();if(r.width>260&&r.height>80)candidates.push({n,r});n=n.parentElement}
    if(innerWidth>760){
      const viable=candidates.filter(c=>c.r.left>=250&&c.r.right<=innerWidth+4&&c.r.width>=650);
      if(viable.length){viable.sort((a,b)=>b.r.width-a.r.width);return viable[0].n}
    }else{
      const viable=candidates.filter(c=>c.r.left<=24&&c.r.right>=innerWidth-24);
      if(viable.length){viable.sort((a,b)=>b.r.width-a.r.width);return viable[0].n}
    }
    return candidates[0]?.n||heading.parentElement
  }

  function dashboardTarget(){
    const h=sectionHeading('Dashboard');if(!h)return null;const root=contentRoot(h);if(!root)return null;
    let intro=h;
    while(intro.parentElement&&intro.parentElement!==root){const pr=intro.parentElement.getBoundingClientRect(),rr=root.getBoundingClientRect();if(pr.width>=rr.width*.72)break;intro=intro.parentElement}
    return {root,anchor:intro,mode:'after'}
  }

  function configTarget(){
    const h=sectionHeading('Configurações');if(!h)return null;const root=contentRoot(h);if(!root)return null;
    const cloudHeading=[...root.querySelectorAll('h1,h2,h3,div')].find(e=>e.offsetParent!==null&&/Betel Cloud — conta e sincronização/i.test((e.textContent||'').trim()));
    if(cloudHeading){
      let card=cloudHeading;const rr=root.getBoundingClientRect();
      while(card.parentElement&&card.parentElement!==root){const pr=card.parentElement.getBoundingClientRect();if(pr.width>=rr.width*.8&&pr.height>=220){card=card.parentElement;break}card=card.parentElement}
      return {root,anchor:card,mode:'after'}
    }
    return {root,anchor:null,mode:'append'}
  }

  function removePanel(){document.getElementById('v082SyncCard')?.remove()}
  function placeCard(card,target){
    if(target.mode==='append'){if(card.parentElement!==target.root||target.root.lastElementChild!==card)target.root.appendChild(card);return}
    if(target.anchor&&target.anchor.nextElementSibling!==card)target.anchor.insertAdjacentElement('afterend',card)
  }

  function render(){
    if(rendering)return;rendering=true;
    try{
      installStyles();const section=currentSection();if(!PANEL_SECTIONS.includes(section)){removePanel();return}
      if(section==='Dashboard'&&innerWidth<=760){removePanel();return}
      const target=section==='Dashboard'?dashboardTarget():configTarget();if(!target){removePanel();return}
      let card=document.getElementById('v082SyncCard');if(!card){card=document.createElement('section');card.id='v082SyncCard'}
      card.className='v082-sync-card '+(section==='Dashboard'?'v082-dashboard':'v082-config')+(state.mobileOpen?' v082-open':'');
      placeCard(card,target);
      const [label,klass]=sourceStatus();const context=section==='Dashboard'?'Resumo da coleta':'Gerenciamento da coleta';
      const sourceText=state.mode==='demo'?'dados de demonstração':'Betel Cloud · OLX/Viva Real descobertos na web';
      card.innerHTML=`<div class="v082-sync-head"><div class="v082-sync-heading"><div class="v082-sync-title">${context}</div><div class="v082-sync-sub">Betel Radar ${VERSION} · ${sourceText}</div></div><div class="v082-head-actions"><span class="v082-badge ${klass}">${label}</span><button type="button" class="v082-mobile-toggle" id="v082MobileToggle" aria-expanded="${state.mobileOpen?'true':'false'}">${state.mobileOpen?'Fechar':'Gerenciar'}</button></div></div><div class="v082-body"><div class="v082-grid"><div class="v082-kpi"><small>Modo</small><b>${state.mode==='demo'?'DEMO':'PRODUÇÃO'}</b></div><div class="v082-kpi"><small>Ativos</small><b>${state.active}</b></div><div class="v082-kpi"><small>Indisponíveis</small><b>${state.unavailable}</b></div><div class="v082-kpi"><small>Última sincronização</small><b class="v082-date">${fmtDate(state.lastSync)}</b></div></div><div class="v082-actions"><button type="button" class="v082-btn primary" data-v082-action="sync">Sincronizar agora</button><button type="button" class="v082-btn" data-v082-action="mode">${state.mode==='demo'?'Ativar PRODUÇÃO':'Voltar para DEMO'}</button><button type="button" class="v082-btn" data-v082-action="endpoint">Configurar fonte</button></div><details class="v082-details"><summary>Como funciona a disponibilidade</summary><div class="v082-note">Enquanto a API oficial da OLX não estiver conectada, anúncios encontrados por índice web entram como <b>Descoberto</b>. Isso indica oportunidade provável, não confirmação oficial de disponibilidade. A automação Brave Search será responsável por renovar esses registros no Betel Cloud.</div></details></div>`;
    }finally{rendering=false}
  }

  async function fetchRows(){
    const endpoint=activeEndpoint();
    const headers={Accept:'application/json'};
    if(endpoint.startsWith(BETEL_CLOUD_URL)){
      headers.apikey=BETEL_CLOUD_KEY;
      headers.Authorization=`Bearer ${BETEL_CLOUD_KEY}`;
    }
    const r=await fetch(endpoint,{headers,cache:'no-store'});
    const text=await r.text();
    if(!r.ok)throw new Error(`HTTP ${r.status} ${text.slice(0,180)}`);
    const payload=text?JSON.parse(text):[];
    return Array.isArray(payload)?payload:(Array.isArray(payload.listings)?payload.listings:[])
  }

  async function syncNow(){
    if(state.mode==='demo'){
      state.status='idle';state.error='';state.active=DEMO_OPPORTUNITIES.length;state.unavailable=0;
      window.opportunities=[...DEMO_OPPORTUNITIES];
      window.dispatchEvent(new CustomEvent('betel:opportunities-synced',{detail:{count:DEMO_OPPORTUNITIES.length,all:DEMO_OPPORTUNITIES,mode:'demo'}}));
      render();return
    }
    try{
      state.status='syncing';state.error='';render();
      const rows=await fetchRows();
      const normalized=rows.map(normalizeListing);
      const active=normalized.filter(x=>x.availabilityStatus==='active');
      state.active=active.length;
      state.unavailable=normalized.filter(x=>['unavailable','removed','missing'].includes(x.availabilityStatus)).length;
      state.lastSync=new Date().toISOString();localStorage.setItem(KEY_LAST,state.lastSync);state.status='success';
      window.opportunities=active;
      window.dispatchEvent(new CustomEvent('betel:opportunities-synced',{detail:{count:active.length,all:normalized,mode:'production'}}));
    }catch(e){state.status='error';state.error=String(e?.message||e)}
    render()
  }

  function setEndpoint(){
    const current=state.endpoint||DEFAULT_LISTINGS_ENDPOINT;
    const v=prompt('Endpoint de leitura das oportunidades. Deixe vazio para usar o Betel Cloud padrão:',current);
    if(v!==null){
      const next=v.trim();
      state.endpoint=next===DEFAULT_LISTINGS_ENDPOINT?'':next;
      if(state.endpoint)localStorage.setItem(KEY_ENDPOINT,state.endpoint);else localStorage.removeItem(KEY_ENDPOINT);
      render()
    }
  }
  function toggleMode(){state.mode=state.mode==='demo'?'production':'demo';localStorage.setItem(KEY_MODE,state.mode);syncNow()}
  function delegatedAction(e){
    const toggle=e.target.closest?.('#v082MobileToggle');if(toggle){e.preventDefault();e.stopPropagation();state.mobileOpen=!state.mobileOpen;render();return}
    const action=e.target.closest?.('[data-v082-action]');if(!action)return;
    e.preventDefault();e.stopPropagation();const a=action.dataset.v082Action;if(a==='sync')syncNow();else if(a==='mode')toggleMode();else if(a==='endpoint')setEndpoint()
  }

  function expose(){window.BetelRadarSync={version:VERSION,state,normalizeListing,syncNow,setEndpoint(v){state.endpoint=String(v||'').trim();if(state.endpoint)localStorage.setItem(KEY_ENDPOINT,state.endpoint);else localStorage.removeItem(KEY_ENDPOINT);render()},setMode(v){state.mode=v==='production'?'production':'demo';localStorage.setItem(KEY_MODE,state.mode);syncNow()}}}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
  function boot(){
    expose();
    if(booted){render();return}
    booted=true;
    if(state.mode==='production')syncNow();else{state.active=DEMO_OPPORTUNITIES.length;render()}
  }

  document.addEventListener('click',delegatedAction,true);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.nav-item,.bottom-nav,.mobile-bottom-nav,[data-section],[onclick*="showSection"],[onclick*="navigate"]'))setTimeout(schedule,90)
  },true);
  window.addEventListener('pageshow',()=>setTimeout(boot,130));
  window.addEventListener('resize',()=>setTimeout(schedule,100),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(schedule,120)});
  setTimeout(()=>{if(!booted)boot()},650);
})();