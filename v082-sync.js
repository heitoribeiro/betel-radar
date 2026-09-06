/* Betel Radar v0.8.2 — camada de sincronização build 8201 */
(function(){
  const VERSION='v0.8.2';
  const KEY_MODE='betel_data_mode';
  const KEY_ENDPOINT='betel_sync_endpoint';
  const KEY_LAST='betel_sync_last';
  const DEFAULT_INTERVAL_MINUTES=60;

  const state={
    mode:localStorage.getItem(KEY_MODE)||'demo',
    endpoint:localStorage.getItem(KEY_ENDPOINT)||'',
    intervalMinutes:DEFAULT_INTERVAL_MINUTES,
    lastSync:localStorage.getItem(KEY_LAST)||'',
    status:'idle',
    active:0,
    unavailable:0,
    error:''
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
      .v082-sync-card{margin:18px 0;padding:16px;border:1px solid #e7e4df;border-radius:18px;background:linear-gradient(180deg,#fff,#faf9f6);box-shadow:0 10px 28px rgba(20,20,20,.055)}
      .v082-sync-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.v082-sync-title{font-weight:800;font-size:15px;color:#171717}.v082-sync-sub{font-size:12px;color:#777;margin-top:3px}.v082-badge{font-size:11px;font-weight:800;padding:6px 9px;border-radius:999px;background:#f1eee9;color:#72563b}.v082-badge.ok{background:#e8f7ef;color:#177a52}.v082-badge.warn{background:#fff4da;color:#946400}.v082-badge.err{background:#fde9ec;color:#a52e3e}
      .v082-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.v082-kpi{padding:12px;border-radius:14px;border:1px solid #ece8e2;background:#fff}.v082-kpi small{display:block;color:#858585;font-size:11px}.v082-kpi b{display:block;font-size:18px;margin-top:4px;color:#181818}.v082-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.v082-btn{border:1px solid #dedad4;background:#fff;border-radius:12px;padding:9px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.v082-btn.primary{background:#171717;color:#fff;border-color:#171717}.v082-note{font-size:11px;color:#777;margin-top:10px;line-height:1.45}
      @media(max-width:760px){.v082-grid{grid-template-columns:1fr 1fr}.v082-actions{display:grid;grid-template-columns:1fr}.v082-btn{width:100%}}
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

  function findHost(){
    const h=[...document.querySelectorAll('h1,h2,h3')].find(e=>e.offsetParent!==null&&/dashboard|configura/i.test(e.textContent||''));
    return h?.closest('.view,.content-view,.page,.panel')||h?.parentElement||document.body;
  }

  function render(){
    installStyles();
    let card=document.getElementById('v082SyncCard');
    if(!card){
      card=document.createElement('section');card.id='v082SyncCard';card.className='v082-sync-card';
      const host=findHost();
      const anchor=[...host.querySelectorAll('h1,h2,h3')].find(e=>e.offsetParent!==null);
      if(anchor)anchor.insertAdjacentElement('afterend',card); else host.prepend(card);
    }
    const [label,klass]=sourceStatus();
    card.innerHTML=`<div class="v082-sync-head"><div><div class="v082-sync-title">Motor de coleta e disponibilidade</div><div class="v082-sync-sub">Betel Radar ${VERSION} · atualização prevista a cada ${state.intervalMinutes} min</div></div><span class="v082-badge ${klass}">${label}</span></div>
    <div class="v082-grid"><div class="v082-kpi"><small>Modo</small><b>${state.mode==='demo'?'DEMO':'PRODUÇÃO'}</b></div><div class="v082-kpi"><small>Ativos</small><b>${state.active}</b></div><div class="v082-kpi"><small>Indisponíveis</small><b>${state.unavailable}</b></div><div class="v082-kpi"><small>Última sincronização</small><b style="font-size:12px">${fmtDate(state.lastSync)}</b></div></div>
    <div class="v082-actions"><button class="v082-btn primary" id="v082SyncNow">Sincronizar agora</button><button class="v082-btn" id="v082ToggleMode">Alternar para ${state.mode==='demo'?'PRODUÇÃO':'DEMO'}</button><button class="v082-btn" id="v082SetEndpoint">Configurar endpoint</button></div>
    <div class="v082-note">A coleta real somente será ativada quando houver endpoint autorizado da fonte. O front-end não executa crawling da OLX. Ausências consecutivas serão tratadas pelo backend como <b>missing</b>, depois <b>unavailable</b> e, conforme a política, <b>removed</b>.</div>`;
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

  function run(){expose();render()}
  document.addEventListener('click',()=>setTimeout(render,120));
  window.addEventListener('pageshow',()=>setTimeout(run,150));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(render,150)});
  setTimeout(run,700);
})();
