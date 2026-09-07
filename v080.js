/* Betel Radar v0.8.0 — produção + georreferenciamento assistido build 8210 */
(function(){
  const VERSION='v0.8.0';
  const ALL_STAGES=['Novo','Analisado','Interessante','Contato pendente','Contatado','Respondeu','Orçamento','Contratado'];
  function versionChip(){const help=document.querySelector('#configView .auth-help');if(help&&!document.getElementById('versionChip')){const el=document.createElement('span');el.id='versionChip';el.className='version-chip';el.textContent='Betel Radar '+VERSION;help.insertAdjacentElement('afterend',el)}}
  function patchStats(){const funnel=document.getElementById('funnel');if(funnel&&typeof opportunities!=='undefined')funnel.innerHTML=ALL_STAGES.map(s=>`<div class="funnel-row"><span>${s}</span><b>${opportunities.filter(o=>o.status===s).length}</b></div>`).join('')}
  function patchKanban(){if(typeof opportunities==='undefined')return;const root=document.getElementById('kanban');if(!root)return;root.innerHTML=ALL_STAGES.map(s=>`<div class="kanban-col" data-stage="${s}" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="dropCrm(event,'${s.replace(/'/g,"\\'")}')"><h3>${s} (${opportunities.filter(o=>o.status===s).length})</h3>${opportunities.filter(o=>o.status===s).map(o=>`<div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${o.id}')" onclick="openDetail(${o.id})"><strong>${escapeHtml(o.title)}</strong><small>${escapeHtml(o.city)} • Score ${o.score}</small>${o.followUp?`<span class="followup-badge">📅 ${formatFollowUp(o.followUp)}</span>`:''}</div>`).join('')||'<div class="empty-col">Nenhuma oportunidade nesta etapa.</div>'}</div>`).join('')}
  let leafletMap=null,markers=[],leafletPromise=null;
  function ensureLeaflet(){if(window.L)return Promise.resolve(true);if(leafletPromise)return leafletPromise;leafletPromise=new Promise(resolve=>{if(!document.getElementById('leafletCss')){const c=document.createElement('link');c.id='leafletCss';c.rel='stylesheet';c.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(c)}let s=document.getElementById('leafletJs');if(!s){s=document.createElement('script');s.id='leafletJs';s.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)}else{s.addEventListener('load',()=>resolve(true),{once:true});s.addEventListener('error',()=>resolve(false),{once:true})}setTimeout(()=>resolve(!!window.L),4000)});return leafletPromise}
  function fmtMoney(v){if(v===null||v===undefined||v===''||!Number.isFinite(Number(v)))return 'Preço não informado';return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
  function fmtArea(v){if(v===null||v===undefined||v===''||!Number.isFinite(Number(v))||Number(v)<=0)return '';return Number(v).toLocaleString('pt-BR')+' m²'}
  function locationLabel(o){return o.locationPrecisionLabel||({exact:'Localização exata informada',address:'Localização aproximada — endereço',neighborhood:'Localização aproximada — bairro/localidade',city:'Localização aproximada — município'}[o.geocodePrecision]||'Localização aproximada')}
  function mapPopupItem(o){
    const area=fmtArea(o.areaM2);const where=[o.neighborhood,o.city].filter(Boolean).join(' · ')||o.city||'';
    return `<div style="padding:4px 0 7px;border-bottom:1px solid #eee"><strong style="display:block;line-height:1.25">${escapeHtml(o.title)}</strong><small style="display:block;margin-top:3px">${escapeHtml(where)} · Score ${o.score}</small><small style="display:block;margin-top:2px">${escapeHtml(fmtMoney(o.price))}${area?' · '+escapeHtml(area):''}</small><small style="display:block;margin-top:2px;color:#80623f">${escapeHtml(o.sourceLabel||o.source||'Web')} · ${escapeHtml(locationLabel(o))}</small><button class="text-btn" onclick="openDetail(${o.id})">Ver oportunidade →</button></div>`
  }
  function updateGeoNote(el,points){
    let note=document.getElementById('betelMapGeoNote');
    if(!note){note=document.createElement('div');note.id='betelMapGeoNote';note.style.cssText='font-size:11px;color:#777;line-height:1.4;margin:8px 4px 4px';el.insertAdjacentElement('afterend',note)}
    if(!points.length){note.textContent='Ainda não há anúncios com localização suficiente para exibir no mapa.';return}
    const approx=points.filter(o=>o.geocodePrecision&&o.geocodePrecision!=='exact').length;
    note.textContent=`${points.length} oportunidade${points.length===1?'':'s'} georreferenciada${points.length===1?'':'s'}${approx?` · ${approx} com localização aproximada`:''}. A precisão é indicada ao abrir o marcador.`
  }
  async function patchMap(force=false){
    const el=document.getElementById('opportunityMap');if(!el||typeof opportunities==='undefined')return;const ok=await ensureLeaflet();if(!ok)return;
    el.classList.add('real-map');
    const points=opportunities.filter(o=>Array.isArray(o.coords)&&o.coords.length===2&&o.coords.every(v=>Number.isFinite(Number(v))));
    updateGeoNote(el,points);
    if(!leafletMap){el.innerHTML='';leafletMap=L.map(el,{zoomControl:true,scrollWheelZoom:true}).setView([-12.82,-38.39],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(leafletMap);L.control.scale({imperial:false}).addTo(leafletMap)}
    markers.forEach(m=>m.remove());markers=[];
    const groups=new Map();
    points.forEach(o=>{const lat=Number(o.coords[0]),lng=Number(o.coords[1]);const key=`${lat.toFixed(6)},${lng.toFixed(6)}`;if(!groups.has(key))groups.set(key,{coords:[lat,lng],items:[]});groups.get(key).items.push(o)});
    const bounds=[];
    groups.forEach(group=>{
      const top=[...group.items].sort((a,b)=>(b.score||0)-(a.score||0))[0];const cls=scoreClass(top.score);const bg=cls==='high'?'#0b8f55':cls==='medium'?'#d97706':'#374151';const count=group.items.length;
      const countBadge=count>1?`<span style="position:absolute;right:-8px;top:-9px;min-width:18px;height:18px;padding:0 4px;border-radius:10px;background:#171717;color:#fff;border:2px solid #fff;display:grid;place-items:center;font-size:9px;font-weight:900">${count}</span>`:'';
      const markerHtml=`<div style="position:relative;width:50px;height:50px"><div class="score-marker ${cls}" style="width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:${bg};color:#fff;border:4px solid #fff;box-shadow:0 5px 18px rgba(0,0,0,.45),0 0 0 2px rgba(0,0,0,.2);font-size:15px;font-weight:900;line-height:1;box-sizing:border-box">${top.score}</div>${countBadge}</div>`;
      const icon=L.divIcon({className:'betel-score-icon',html:markerHtml,iconSize:[50,50],iconAnchor:[25,25]});
      const m=L.marker(group.coords,{icon}).addTo(leafletMap);
      const heading=count>1?`<div style="font-weight:800;margin-bottom:4px">${count} oportunidades nesta referência geográfica</div>`:'';
      m.bindPopup(`<div class="map-popup" style="min-width:230px;max-width:290px;max-height:320px;overflow:auto">${heading}${group.items.map(mapPopupItem).join('')}</div>`);
      markers.push(m);bounds.push(group.coords)
    });
    if(bounds.length>1)leafletMap.fitBounds(bounds,{padding:[40,40],maxZoom:11});else if(bounds.length===1)leafletMap.setView(bounds[0],12);else leafletMap.setView([-12.82,-38.39],10);
    if(force)setTimeout(()=>leafletMap.invalidateSize(),100)
  }
  function refreshCurrentView(){const active=document.querySelector('.nav-item.active');const view=active?.dataset?.view;if(view==='dashboard')patchStats();else if(view==='crm')patchKanban();else if(view==='mapa')patchMap(true);else if(view==='config')versionChip()}

  function syncMobileMenuAndMap(){
    const map=document.getElementById('opportunityMap');
    if(window.innerWidth>760){
      document.body.classList.remove('betel-menu-open');
      if(map){map.style.visibility='';map.style.pointerEvents='';map.style.clipPath='';map.style.webkitClipPath='';}
      return;
    }
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar||!map)return;
    const sr=sidebar.getBoundingClientRect();
    const mr=map.getBoundingClientRect();
    const open=sr.width>120&&sr.right>80&&sr.left>-20;
    document.body.classList.toggle('betel-menu-open',open);
    if(open){
      const overlap=Math.max(0,Math.min(mr.width,sr.right-mr.left));
      map.style.visibility='visible';
      map.style.pointerEvents='none';
      map.style.clipPath=`inset(0 0 0 ${overlap}px)`;
      map.style.webkitClipPath=`inset(0 0 0 ${overlap}px)`;
    }else{
      map.style.visibility='';
      map.style.pointerEvents='';
      map.style.clipPath='';
      map.style.webkitClipPath='';
      if(leafletMap)setTimeout(()=>leafletMap.invalidateSize(),60);
    }
  }

  document.addEventListener('click',e=>{const nav=e.target.closest('.nav-item');if(nav){const view=nav.dataset.view;if(view==='crm')setTimeout(patchKanban,60);if(view==='mapa')setTimeout(()=>patchMap(true),120);if(view==='dashboard')setTimeout(patchStats,60);if(view==='config')setTimeout(versionChip,60)}setTimeout(syncMobileMenuAndMap,20);setTimeout(syncMobileMenuAndMap,180)});
  window.addEventListener('resize',syncMobileMenuAndMap,{passive:true});
  setInterval(syncMobileMenuAndMap,600);
  window.addEventListener('betel:real-data-ready',()=>setTimeout(()=>patchMap(true),180));
  if(typeof window.renderAll==='function'){const originalRenderAll=window.renderAll;window.renderAll=function(){const result=originalRenderAll.apply(this,arguments);setTimeout(refreshCurrentView,0);return result}};
  setTimeout(()=>{patchStats();versionChip();syncMobileMenuAndMap()},100);setTimeout(refreshCurrentView,500);
})();
