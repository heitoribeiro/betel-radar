/* Betel Radar v0.8.0 — patch funcional isolado */
(function(){
  const VERSION='v0.8.0';
  const ALL_STAGES=['Novo','Analisado','Interessante','Contato pendente','Contatado','Respondeu','Orçamento','Contratado'];

  function versionChip(){
    const help=document.querySelector('#configView .auth-help');
    if(help&&!document.getElementById('versionChip')){
      const el=document.createElement('span');el.id='versionChip';el.className='version-chip';el.textContent='Betel Radar '+VERSION;help.insertAdjacentElement('afterend',el);
    }
  }

  const oldStats=window.renderStats;
  window.renderStats=function(){
    if(typeof oldStats==='function')oldStats();
    const funnel=document.getElementById('funnel');
    if(funnel&&typeof opportunities!=='undefined')funnel.innerHTML=ALL_STAGES.map(s=>`<div class="funnel-row"><span>${s}</span><b>${opportunities.filter(o=>o.status===s).length}</b></div>`).join('');
  };

  window.renderKanban=function(){
    if(typeof opportunities==='undefined')return;
    const root=document.getElementById('kanban');if(!root)return;
    root.innerHTML=ALL_STAGES.map(s=>`<div class="kanban-col" data-stage="${s}" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="dropCrm(event,'${s.replace(/'/g,"\\'")}')"><h3>${s} (${opportunities.filter(o=>o.status===s).length})</h3>${opportunities.filter(o=>o.status===s).map(o=>`<div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${o.id}')" onclick="openDetail(${o.id})"><strong>${escapeHtml(o.title)}</strong><small>${escapeHtml(o.city)} • Score ${o.score}</small>${o.followUp?`<span class="followup-badge">📅 ${formatFollowUp(o.followUp)}</span>`:''}</div>`).join('')||'<div class="empty-col">Nenhuma oportunidade nesta etapa.</div>'}</div>`).join('');
    const tabs=document.getElementById('crmTabs');if(tabs)tabs.innerHTML=ALL_STAGES.map(s=>`<button class="chip ${s===activeCrmStage?'active':''}" onclick="selectCrmStage('${s}')">${s} (${opportunities.filter(o=>o.status===s).length})</button>`).join('');
    const sel=document.getElementById('crmStageSelect');if(sel){sel.innerHTML=ALL_STAGES.map(s=>`<option ${s===activeCrmStage?'selected':''}>${s}</option>`).join('');sel.onchange=()=>selectCrmStage(sel.value)}
    const mobile=document.getElementById('crmMobileCards');if(mobile){const items=opportunities.filter(o=>o.status===activeCrmStage);mobile.innerHTML=items.map(o=>`<div class="radar-card" onclick="openDetail(${o.id})"><h3>${escapeHtml(o.title)}</h3><p>${escapeHtml(o.city)} • Score ${o.score}</p>${o.followUp?`<span class="followup-badge">📅 ${formatFollowUp(o.followUp)}</span>`:''}</div>`).join('')||'<div class="empty-state"><p>Nenhuma oportunidade nesta etapa.</p></div>'}
  };

  let map=null,markers=[];
  const fallback=window.renderMap;
  function leaflet(){
    return new Promise(resolve=>{
      if(window.L)return resolve(true);
      if(!document.getElementById('leafletCss')){const c=document.createElement('link');c.id='leafletCss';c.rel='stylesheet';c.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(c)}
      let s=document.getElementById('leafletJs');
      if(!s){s=document.createElement('script');s.id='leafletJs';s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)}
      else if(window.L)resolve(true);else{s.addEventListener('load',()=>resolve(true),{once:true});s.addEventListener('error',()=>resolve(false),{once:true})}
      setTimeout(()=>resolve(!!window.L),5000);
    });
  }

  window.renderMap=async function(force=false){
    const el=document.getElementById('opportunityMap');if(!el||typeof opportunities==='undefined')return;
    const ok=await leaflet();
    if(!ok){el.classList.remove('real-map');if(typeof fallback==='function')fallback();return}
    el.classList.add('real-map');el.innerHTML='';
    const pts=opportunities.filter(o=>Array.isArray(o.coords)&&o.coords.length===2);
    if(!map){map=L.map(el,{zoomControl:true,scrollWheelZoom:true}).setView([-12.82,-38.39],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);L.control.scale({imperial:false}).addTo(map)}
    markers.forEach(m=>m.remove());markers=[];const bounds=[];
    pts.forEach(o=>{const cls=scoreClass(o.score);const icon=L.divIcon({className:'',html:`<div class="score-marker ${cls}">${o.score}</div>`,iconSize:[34,34],iconAnchor:[17,17]});const m=L.marker(o.coords,{icon}).addTo(map);m.bindPopup(`<div class="map-popup"><strong>${escapeHtml(o.title)}</strong><small>${escapeHtml(o.city)} • Score ${o.score}<br>${escapeHtml(o.advertiser||'')}</small><button class="text-btn" onclick="openDetail(${o.id})">Abrir ficha →</button></div>`);markers.push(m);bounds.push(o.coords)});
    if(bounds.length>1)map.fitBounds(bounds,{padding:[35,35],maxZoom:12});else if(bounds.length===1)map.setView(bounds[0],12);
    if(force)setTimeout(()=>map.invalidateSize(),80);
    const side=document.getElementById('mapSide');if(side)side.innerHTML=[...opportunities].sort((a,b)=>b.score-a.score).slice(0,7).map(o=>`<div class="map-mini" onclick="openDetail(${o.id})"><strong>${escapeHtml(o.title)}</strong><small>${escapeHtml(o.city)} • Score ${o.score}</small></div>`).join('');
  };

  const oldShow=window.showView;
  window.showView=function(name){if(typeof oldShow==='function')oldShow(name);if(name==='mapa')setTimeout(()=>window.renderMap(true),120);if(name==='crm')setTimeout(()=>window.renderKanban(),30)};
  const oldAll=window.renderAll;
  window.renderAll=function(){if(typeof oldAll==='function')oldAll();window.renderStats();window.renderKanban();versionChip()};

  try{window.renderStats();window.renderKanban();versionChip()}catch(e){console.warn('v0.8.0 dev patch:',e)}
})();
