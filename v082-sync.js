/* Betel Radar v0.8.2 — camada de sincronização build 8203 */
(function(){
  const VERSION='v0.8.2';
  const KEY_MODE='betel_data_mode';
  const KEY_ENDPOINT='betel_sync_endpoint';
  const KEY_LAST='betel_sync_last';
  const DEFAULT_INTERVAL_MINUTES=60;
  const PANEL_SECTIONS=['Dashboard','Configurações'];

  const state={
    mode:localStorage.getItem(KEY_MODE)||'demo',
    endpoint:localStorage.getItem(KEY_ENDPOINT)||'',
    intervalMinutes:DEFAULT_INTERVAL_MINUTES,
    lastSync:localStorage.getItem(KEY_LAST)||'',
    status:'idle',
    active:0,
    unavailable:0,
    error:'',
    mobileOpen:false
  };

  function fmtDate(v){
    if(!v)return 'Nunca';
    const d=new Date(v);return isNaN(d)?'Nunca':d.toLocaleString('pt-BR');
  }

  function normalizeListing(x){
    return {
      id:x.id||`${x.source||'source'}:${x.external_id||x.externalId||crypto.randomUUID()}`,
      source:x.source||'olx',
      externalId:x.external_id||x.externalId||'',
      title:x.title||'Imóvel sem título',
      description:x.description||'',
      advertiser:x.advertiser||'',
      city:x.city||'',
      state:x.state||'',
      neighborhood:x.neighborhood||'',
      price:x.price??null,
      propertyType:x.property_type||x.propertyType||'',
      listingType:x.listing_type||x.listingType||'',
      bedrooms:x.bedrooms??null,
      bathrooms:x.bathrooms??null,
      parkingSpaces:x.parking_spaces??x.parkingSpaces??null,
      areaM2:x.area_m2??x.areaM2??null,
      latitude:x.latitude??null,
      longitude:x.longitude??null,
      url:x.source_url||x.url||'',
      imageUrls:Array.isArray(x.image_urls)?x.image_urls:(Array.isArray(x.imageUrls)?x.imageUrls:[]),
      firstSeen:x.first_seen_at||x.firstSeen||'',
      lastSeen:x.last_seen_at||x.lastSeen||'',
      availabilityStatus:x.availability_status||x.availabilityStatus||'active',
      status:'Novo',
      sourceListing:true
    };
  }

  function installStyles(){
    if(document.getElementById('v082SyncStyles'))return;
    const s=document.createElement('style');s.id='v082SyncStyles';s.textContent=`
      #v082SyncCard{position:relative!important;inset:auto!important;transform:none!important;float:none!important;clear:both!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;z-index:1!important;align-self:stretch!important;grid-column:1/-1!important}
      .v082-sync-card{margin:16px 0 20px;padding:14px 16px;border:1px solid #e7e4df;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(20,20,20,.045);overflow:hidden}
      .v082-sync-head{display:flex;justify-content:space-between;align-items:center;gap:14px;min-width:0}.v082-sync-heading{min-width:0}.v082-sync-title{font-weight:800;font-size:14px;color:#171717}.v082-sync-sub{font-size:11px;color:#777;margin-top:2px;white-space:normal}.v082-head-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.v082-badge{font-size:10px;font-weight:800;padding:5px 8px;border-radius:999px;background:#f1eee9;color:#72563b;white-space:nowrap}.v082-badge.ok{background:#e8f7ef;color:#177a52}.v082-badge.warn{background:#fff4da;color:#946400}.v082-badge.err{background:#fde9ec;color:#a52e3e}.v082-mobile-toggle{display:none;border:1px solid #dedad4;background:#fff;border-radius:9px;padding:6px 8px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}
      .v082-body{display:block}.v082-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.v082-kpi{min-width:0;padding:10px 11px;border-radius:12px;border:1px solid #ece8e2;background:#fafafa}.v082-kpi small{display:block;color:#858585;font-size:10px;line-height:1.15}.v082-kpi b{display:block;font-size:16px;line-height:1.15;margin-top:4px;color:#181818;overflow:hidden;text-overflow:ellipsis}.v082-kpi .v082-date{font-size:11px;white-space:normal}
      .v082-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}.v082-btn{appearance:none;border:1px solid #dedad4;background:#fff;border-radius:10px;padding:8px 11px;font:inherit;font-size:11px;font-weight:800;line-height:1.15;cursor:pointer;white-space:nowrap}.v082-btn.primary{background:#171717;color:#fff;border-color:#171717}.v082-btn:hover{filter:brightness(.98)}
      .v082-details{margin-top:10px;border-top:1px solid #eeeae4;padding-top:8px}.v082-details summary{cursor:pointer;font-size:10px;font-weight:700;color:#777;list-style:none}.v082-details summary::-webkit-details-marker{display:none}.v082-details summary:before{content:'＋ ';font-weight:900}.v082-details[open] summary:before{content:'− '}.v082-note{font-size:10px;color:#777;margin-top:7px;line-height:1.45}
      @media(max-width:760px){
        .v082-sync-card{margin:10px 0 12px;padding:10px 11px;border-radius:13px;box-shadow:none}
        .v082-sync-head{gap:8px}.v082-sync-title{font-size:12px}.v082-sync-sub{font-size:9px;line-height:1.25}.v082-head-actions{gap:5px}.v082-badge{font-size:8px;padding:4px 6px}.v082-mobile-toggle{display:inline-block}
        .v082-body{display:none}.v082-sync-card.v082-open .v082-body{display:block}
        .v082-grid{grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.v082-kpi{padding:8px}.v082-kpi small{font-size:8px}.v082-kpi b{font-size:13px}.v082-kpi .v082-date{font-size:9px}
        .v082-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.v082-btn{width:100%;padding:7px 6px;font-size:9px;white-space:normal}.v082-btn.primary{grid-column:1/-1}
        .v082-details{margin-top:7px;padding-top:6px}.v082-note,.v082-details summary{font-size:8px}
      }
      @media(max-width:380px){.v082-actions{grid-template-columns:1fr}.v082-btn.primary{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function sourceStatus(){
    if(state.mode==='demo')return ['DEMO','warn'];
    if(!state.endpoint)return ['Aguardando fonte','warn'];
    if(state.status==='syncing')return ['Sincronizando','warn'];
    if(state.status==='error')return ['Erro','err'];
    if(state.status==='success')return ['Sincronizado','ok'];
    return ['Produção','ok'];
  }

  function currentSection(){
    const active=document.querySelector('.nav-item.active,[aria-current="page"]');
    if(active){
      const t=(active.textContent||'').trim().replace(/\s+/g,' ');
      const labels=['Dashboard','Radar','Radar Visual','Mapa','Contatos','CRM','Agenda','Financeiro','Mensagens IA','Configurações'];
      const hit=labels.find(x=>t===x||t.endsWith(x));
      if(hit)return hit;
    }
    const visibleHeadings=[...document.querySelectorAll('h1,h2,h3')].filter(e=>e.offsetParent!==null);
    const labels=['Dashboard','Radar Visual','Radar','Mapa','Contatos','CRM','Agenda','Financeiro','Mensagens IA','Configurações'];
    for(const label of labels){if(visibleHeadings.some(h=>(h.textContent||'').trim().toLowerCase().includes(label.toLowerCase())))return label;}
    return '';
  }

  function pageTarget(section){
    const headings=[...document.querySelectorAll('h1,h2,h3')].filter(e=>e.offsetParent!==null);
    const heading=headings.find(e=>(e.textContent||'').trim().toLowerCase().includes(section.toLowerCase()));
    if(!heading)return null;

    let root=heading.parentElement;
    let best=root;
    while(root&&root!==document.body){
      const r=root.getBoundingClientRect();
      if(r.width>=Math.min(innerWidth*0.55,700))best=root;
      root=root.parentElement;
    }

    if(section==='Configurações')return {root:best,heading,mode:'append'};

    let intro=heading;
    while(intro.parentElement&&intro.parentElement!==best){
      const pr=intro.parentElement.getBoundingClientRect();
      if(pr.width>=best.getBoundingClientRect().width*.75)break;
      intro=intro.parentElement;
    }
    return {root:best,heading,intro,mode:'afterIntro'};
  }

  function removePanel(){
    const card=document.getElementById('v082SyncCard');
    if(card)card.remove();
  }

  function placeCard(card,target){
    if(target.mode==='append'){
      if(card.parentElement!==target.root||target.root.lastElementChild!==card){target.root.appendChild(card)}
      return;
    }
    const anchor=target.intro||target.heading;
    if(anchor.nextElementSibling!==card)anchor.insertAdjacentElement('afterend',card);
  }

  function render(){
    installStyles();
    const section=currentSection();
    if(!PANEL_SECTIONS.includes(section)){removePanel();return;}

    const target=pageTarget(section);
    if(!target){removePanel();return;}

    let card=document.getElementById('v082SyncCard');
    if(!card){card=document.createElement('section');card.id='v082SyncCard';card.className='v082-sync-card';}
    card.classList.toggle('v082-open',state.mobileOpen);
    placeCard(card,target);

    const [label,klass]=sourceStatus();
    const context=section==='Dashboard'?'Resumo da coleta':'Gerenciamento da coleta';
    card.innerHTML=`<div class="v082-sync-head"><div class="v082-sync-heading"><div class="v082-sync-title">${context}</div><div class="v082-sync-sub">Betel Radar ${VERSION} · atualização prevista a cada ${state.intervalMinutes} min</div></div><div class="v082-head-actions"><span class="v082-badge ${klass}">${label}</span><button class="v082-mobile-toggle" id="v082MobileToggle">${state.mobileOpen?'Fechar':'Gerenciar'}</button></div></div>
    <div class="v082-body"><div class="v082-grid"><div class="v082-kpi"><small>Modo</small><b>${state.mode==='demo'?'DEMO':'PRODUÇÃO'}</b></div><div class="v082-kpi"><small>Ativos</small><b>${state.active}</b></div><div class="v082-kpi"><small>Indisponíveis</small><b>${state.unavailable}</b></div><div class="v082-kpi"><small>Última sincronização</small><b class="v082-date">${fmtDate(state.lastSync)}</b></div></div>
    <div class="v082-actions"><button class="v082-btn primary" id="v082SyncNow">Sincronizar agora</button><button class="v082-btn" id="v082ToggleMode">${state.mode==='demo'?'Ativar PRODUÇÃO':'Voltar para DEMO'}</button><button class="v082-btn" id="v082SetEndpoint">Configurar fonte</button></div>
    <details class="v082-details"><summary>Como funciona a disponibilidade</summary><div class="v082-note">A coleta real será ativada quando houver endpoint autorizado da fonte. O front-end não executa crawling da OLX. Ausências consecutivas são tratadas pelo backend como <b>missing</b>, depois <b>unavailable</b> e, conforme a política, <b>removed</b>.</div></details></div>`;

    card.querySelector('#v082MobileToggle').onclick=()=>{state.mobileOpen=!state.mobileOpen;render()};
    card.querySelector('#v082SyncNow').onclick=syncNow;
    card.querySelector('#v082ToggleMode').onclick=()=>{state.mode=state.mode==='demo'?'production':'demo';localStorage.setItem(KEY_MODE,state.mode);render()};
    card.querySelector('#v082SetEndpoint').onclick=()=>{const v=prompt('Endpoint autorizado de sincronização:',state.endpoint||'');if(v!==null){state.endpoint=v.trim();localStorage.setItem(KEY_ENDPOINT,state.endpoint);render()}};
  }

  async function syncNow(){
    if(state.mode==='demo'){state.status='idle';state.error='';render();return;}
    if(!state.endpoint){state.status='error';state.error='Endpoint não configurado';render();return;}
    try{
      state.status='syncing';state.error='';render();
      const r=await fetch(state.endpoint,{headers:{'Accept':'application/json'},cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const payload=await r.json();
      const rows=Array.isArray(payload)?payload:(Array.isArray(payload.listings)?payload.listings:[]);
      const normalized=rows.map(normalizeListing);
      const active=normalized.filter(x=>x.availabilityStatus==='active');
      state.active=active.length;
      state.unavailable=normalized.filter(x=>['unavailable','removed','missing'].includes(x.availabilityStatus)).length;
      state.lastSync=new Date().toISOString();localStorage.setItem(KEY_LAST,state.lastSync);
      state.status='success';
      window.opportunities=active;
      window.dispatchEvent(new CustomEvent('betel:opportunities-synced',{detail:{count:active.length,all:normalized}}));
    }catch(e){state.status='error';state.error=String(e?.message||e)}
    render();
  }

  function expose(){
    window.BetelRadarSync={version:VERSION,state,normalizeListing,syncNow,setEndpoint(v){state.endpoint=String(v||'').trim();localStorage.setItem(KEY_ENDPOINT,state.endpoint);render()},setMode(v){state.mode=v==='production'?'production':'demo';localStorage.setItem(KEY_MODE,state.mode);render()}};
  }

  function schedule(){[60,180,420].forEach(ms=>setTimeout(render,ms));}
  function run(){expose();render()}
  document.addEventListener('click',schedule,true);
  window.addEventListener('pageshow',()=>setTimeout(run,150));
  window.addEventListener('resize',()=>setTimeout(render,100),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(render,150)});
  new MutationObserver(()=>requestAnimationFrame(render)).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(run,700);
})();
