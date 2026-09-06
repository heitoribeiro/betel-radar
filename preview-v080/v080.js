/* Betel Radar v0.8.0 — preview funcional otimizada */
(function(){
  const VERSION='v0.8.0 PREVIEW';
  const ALL_STAGES=['Novo','Analisado','Interessante','Contato pendente','Contatado','Respondeu','Orçamento','Contratado'];

  function versionChip(){
    const help=document.querySelector('#configView .auth-help');
    if(help&&!document.getElementById('versionChip')){
      const el=document.createElement('span');
      el.id='versionChip';
      el.className='version-chip';
      el.textContent='Betel Radar '+VERSION;
      help.insertAdjacentElement('afterend',el);
    }
  }

  function patchStats(){
    const funnel=document.getElementById('funnel');
    if(funnel&&typeof opportunities!=='undefined'){
      funnel.innerHTML=ALL_STAGES.map(s=>`<div class="funnel-row"><span>${s}</span><b>${opportunities.filter(o=>o.status===s).length}</b></div>`).join('');
    }
  }

  function patchKanban(){
    if(typeof opportunities==='undefined')return;
    const root=document.getElementById('kanban');
    if(!root)return;

    root.innerHTML=ALL_STAGES.map(s=>`<div class="kanban-col" data-stage="${s}" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="dropCrm(event,'${s.replace(/'/g,"\\'")}')"><h3>${s} (${opportunities.filter(o=>o.status===s).length})</h3>${opportunities.filter(o=>o.status===s).map(o=>`<div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${o.id}')" onclick="openDetail(${o.id})"><strong>${escapeHtml(o.title)}</strong><small>${escapeHtml(o.city)} • Score ${o.score}</small>${o.followUp?`<span class="followup-badge">📅 ${formatFollowUp(o.followUp)}</span>`:''}</div>`).join('')||'<div class="empty-col">Nenhuma oportunidade nesta etapa.</div>'}</div>`).join('');

    const tabs=document.getElementById('crmTabs');
    if(tabs)tabs.innerHTML=ALL_STAGES.map(s=>`<button class="chip ${s===activeCrmStage?'active':''}" onclick="selectCrmStage('${s}')">${s} (${opportunities.filter(o=>o.status===s).length})</button>`).join('');

    const sel=document.getElementById('crmStageSelect');
    if(sel){
      sel.innerHTML=ALL_STAGES.map(s=>`<option value="${s}" ${s===activeCrmStage?'selected':''}>${s} (${opportunities.filter(o=>o.status===s).length})</option>`).join('');
      sel.onchange=()=>selectCrmStage(sel.value);
    }

    const mobile=document.getElementById('crmMobileList');
    if(mobile){
      const items=opportunities.filter(o=>o.status===activeCrmStage).sort((a,b)=>b.score-a.score);
      mobile.innerHTML=items.map(o=>`<div class="crm-mobile-card" onclick="openDetail(${o.id})"><h3>${escapeHtml(o.title)}</h3><p>${escapeHtml(o.city)} • Score ${o.score} • ${escapeHtml(o.advertiser)}</p>${o.followUp?`<span class="followup-badge">📅 ${formatFollowUp(o.followUp)}</span>`:''}<button class="text-btn">Abrir ficha →</button></div>`).join('')||'<div class="crm-mobile-card"><p>Nenhuma oportunidade nesta etapa.</p></div>';
    }
  }

  let leafletMap=null, markers=[], leafletPromise=null;
  function ensureLeaflet(){
    if(window.L)return Promise.resolve(true);
    if(leafletPromise)return leafletPromise;
    leafletPromise=new Promise(resolve=>{
      if(!document.getElementById('leafletCss')){
        const c=document.createElement('link');
        c.id='leafletCss';c.rel='stylesheet';c.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(c);
      }
      let s=document.getElementById('leafletJs');
      if(!s){
        s=document.createElement('script');
        s.id='leafletJs';s.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
        s.onload=()=>resolve(true);s.onerror=()=>resolve(false);
        document.head.appendChild(s);
      } else {
        s.addEventListener('load',()=>resolve(true),{once:true});
        s.addEventListener('error',()=>resolve(false),{once:true});
      }
      setTimeout(()=>resolve(!!window.L),4000);
    });
    return leafletPromise;
  }

  async function patchMap(force=false){
    const el=document.getElementById('opportunityMap');
    if(!el||typeof opportunities==='undefined')return;
    const ok=await ensureLeaflet();
    if(!ok)return;

    el.classList.add('real-map');
    const points=opportunities.filter(o=>Array.isArray(o.coords)&&o.coords.length===2);
    if(!leafletMap){
      el.innerHTML='';
      leafletMap=L.map(el,{zoomControl:true,scrollWheelZoom:true}).setView([-12.82,-38.39],10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(leafletMap);
      L.control.scale({imperial:false}).addTo(leafletMap);
    }

    markers.forEach(m=>m.remove());markers=[];const bounds=[];
    points.forEach(o=>{
      const cls=scoreClass(o.score);
      const icon=L.divIcon({className:'',html:`<div class="score-marker ${cls}">${o.score}</div>`,iconSize:[34,34],iconAnchor:[17,17]});
      const m=L.marker(o.coords,{icon}).addTo(leafletMap);
      m.bindPopup(`<div class="map-popup"><strong>${escapeHtml(o.title)}</strong><small>${escapeHtml(o.city)} • Score ${o.score}<br>${escapeHtml(o.advertiser||'')}</small><button class="text-btn" onclick="openDetail(${o.id})">Abrir ficha →</button></div>`);
      markers.push(m);bounds.push(o.coords);
    });
    if(bounds.length>1)leafletMap.fitBounds(bounds,{padding:[35,35],maxZoom:12});
    else if(bounds.length===1)leafletMap.setView(bounds[0],12);
    if(force)setTimeout(()=>leafletMap.invalidateSize(),100);
  }

  function refreshCurrentView(){
    const active=document.querySelector('.nav-item.active');
    const view=active?.dataset?.view;
    if(view==='dashboard')patchStats();
    else if(view==='crm')patchKanban();
    else if(view==='mapa')patchMap(true);
    else if(view==='config')versionChip();
  }

  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav-item');
    if(!nav)return;
    const view=nav.dataset.view;
    if(view==='crm')setTimeout(patchKanban,60);
    if(view==='mapa')setTimeout(()=>patchMap(true),120);
    if(view==='dashboard')setTimeout(patchStats,60);
    if(view==='config')setTimeout(versionChip,60);
  });

  if(typeof window.renderAll==='function'){
    const originalRenderAll=window.renderAll;
    window.renderAll=function(){
      const result=originalRenderAll.apply(this,arguments);
      setTimeout(refreshCurrentView,0);
      return result;
    };
  }

  setTimeout(()=>{patchStats();versionChip();},100);
  setTimeout(refreshCurrentView,500);
})();
