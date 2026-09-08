/* Betel Radar v0.8.2 — centralização do mapa + Agenda Hoje integrada, build 8241 */
(function(){
  'use strict';

  const BUILD='8241';
  let mapRefreshBusy=false;
  let mapRetryTimer=null;

  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const visible=el=>{
    if(!el||!(el instanceof Element))return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false;
    const r=el.getBoundingClientRect();
    return r.width>1&&r.height>1;
  };

  function installStyles(){
    if(document.getElementById('v082MapAgendaFinalStyles'))return;
    const s=document.createElement('style');
    s.id='v082MapAgendaFinalStyles';
    s.textContent=`
      [data-v082-hide-native-today="1"]{display:none!important}
      #agendaProductivity .v081-actions{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important}
      #agendaProductivity #v082AgendaTodayButton{appearance:none;border:1px solid #dedad4;border-radius:13px;background:#fff;color:#171717;padding:11px 15px;font:inherit;font-weight:800;cursor:pointer;box-shadow:none;margin:0!important;width:auto!important;white-space:nowrap}
      #agendaProductivity #v082AgendaTodayButton:hover{background:#f7f5f2}
      #v082AgendaTodayFeedback{font-size:11px;color:#777;line-height:1.35;margin:2px 0 0;flex-basis:100%}
      #opportunityMap .leaflet-tile-pane{z-index:200!important}
      #opportunityMap .leaflet-overlay-pane{z-index:400!important}
      #opportunityMap .leaflet-shadow-pane{z-index:500!important}
      #opportunityMap .leaflet-marker-pane{z-index:600!important;visibility:visible!important;opacity:1!important}
      #opportunityMap .leaflet-tooltip-pane{z-index:650!important}
      #opportunityMap .leaflet-popup-pane{z-index:700!important}
      #opportunityMap .betel-score-icon,#opportunityMap .score-marker{visibility:visible!important;opacity:1!important}
      @media(max-width:760px){
        #agendaProductivity .v081-actions{display:grid!important;grid-template-columns:1fr 1fr!important}
        #agendaProductivity #v082AgendaTodayButton,#agendaProductivity #exportAgendaCsv{width:100%!important}
        #v082AgendaTodayFeedback{grid-column:1/-1}
      }
    `;
    document.head.appendChild(s);
  }

  function agendaRoot(){
    const box=document.getElementById('agendaProductivity');
    if(!box||!visible(box))return null;
    return box.closest('.view,.content-view,.page,.panel,main')||box.parentElement||document.body;
  }

  function candidateNativeTodayNodes(){
    const box=document.getElementById('agendaProductivity');
    const root=agendaRoot();
    if(!box||!root)return [];
    const selectors='button,[role="button"],a,input[type="button"],input[type="submit"],.btn,.button,div,span';
    const boxRect=box.getBoundingClientRect();
    return [...root.querySelectorAll(selectors)].filter(el=>{
      if(el===document.getElementById('v082AgendaTodayButton')||box.contains(el)||!visible(el))return false;
      const text=norm(el.value||el.textContent);
      if(text!=='Hoje')return false;
      const r=el.getBoundingClientRect();
      const nearVertical=r.top<boxRect.bottom+30&&r.bottom>boxRect.top-30;
      const nearHorizontal=r.left>boxRect.left-40&&r.left<boxRect.right+160;
      return nearVertical&&nearHorizontal&&r.width<=140&&r.height<=80;
    });
  }

  function hideNativeToday(){
    for(const node of candidateNativeTodayNodes()){
      const clickTarget=node.closest('button,[role="button"],a,.btn,.button')||node;
      clickTarget.setAttribute('data-v082-hide-native-today','1');
    }
  }

  function localDayKey(value){
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function todayFollowUps(){
    const list=Array.isArray(window.opportunities)?window.opportunities:[];
    const key=localDayKey(new Date());
    return list.filter(o=>o?.followUp&&localDayKey(o.followUp)===key);
  }

  function setAgendaFeedback(text){
    const box=document.getElementById('agendaProductivity');
    const actions=box?.querySelector('.v081-actions');
    if(!actions)return;
    let feedback=document.getElementById('v082AgendaTodayFeedback');
    if(!feedback){
      feedback=document.createElement('div');
      feedback.id='v082AgendaTodayFeedback';
      actions.appendChild(feedback);
    }
    feedback.textContent=text;
  }

  function handleToday(){
    const rows=todayFollowUps();
    if(!rows.length){
      setAgendaFeedback('Não há follow-up programado para hoje.');
      return;
    }
    setAgendaFeedback(`${rows.length} follow-up${rows.length===1?'':'s'} programado${rows.length===1?'':'s'} para hoje.`);
    const root=agendaRoot();
    const first=[...root.querySelectorAll('[data-id],.agenda-item,.followup-card,.card,li,tr')].find(el=>{
      const text=norm(el.textContent);
      return rows.some(o=>text.includes(norm(o.title||''))&&norm(o.title||'').length>2);
    });
    first?.scrollIntoView?.({behavior:'smooth',block:'center'});
  }

  function ensureAgendaToday(){
    const box=document.getElementById('agendaProductivity');
    if(!box||!visible(box))return false;
    const actions=box.querySelector('.v081-actions');
    if(!actions)return false;

    hideNativeToday();

    let btn=document.getElementById('v082AgendaTodayButton');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='v082AgendaTodayButton';
      btn.textContent='Hoje';
      btn.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        handleToday();
      });
    }
    if(btn.parentElement!==actions)actions.appendChild(btn);
    return true;
  }

  function mapVisible(){
    const el=document.getElementById('opportunityMap');
    return !!(el&&visible(el)&&el.classList.contains('leaflet-container'));
  }

  function withCoordsCount(){
    const list=Array.isArray(window.opportunities)?window.opportunities:[];
    return list.filter(o=>Array.isArray(o?.coords)&&o.coords.length===2&&o.coords.every(v=>Number.isFinite(Number(v)))).length;
  }

  function markerCentroidOff(){
    const map=document.getElementById('opportunityMap');
    if(!map)return false;
    const markers=[...map.querySelectorAll('.betel-score-icon,.score-marker')].filter(visible);
    if(!markers.length)return withCoordsCount()>0;
    const mr=map.getBoundingClientRect();
    const centers=markers.map(el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
    const cx=centers.reduce((a,p)=>a+p[0],0)/centers.length;
    const cy=centers.reduce((a,p)=>a+p[1],0)/centers.length;
    const mx=mr.left+mr.width/2, my=mr.top+mr.height/2;
    return Math.abs(cx-mx)>mr.width*.28||Math.abs(cy-my)>mr.height*.28;
  }

  function performMapRefresh(reason='manual'){
    if(mapRefreshBusy||!mapVisible())return;
    mapRefreshBusy=true;
    try{
      window.dispatchEvent(new Event('resize'));
      if(typeof window.renderAll==='function')window.renderAll();
      document.body?.setAttribute('data-betel-map-refresh',`${BUILD}:${reason}`);
    }catch{}
    setTimeout(()=>{
      mapRefreshBusy=false;
      if(mapVisible()&&markerCentroidOff()){
        clearTimeout(mapRetryTimer);
        mapRetryTimer=setTimeout(()=>{
          try{
            window.dispatchEvent(new Event('resize'));
            if(typeof window.renderAll==='function')window.renderAll();
          }catch{}
        },260);
      }
    },220);
  }

  function scheduleMapRefresh(reason){
    setTimeout(()=>performMapRefresh(reason+'-1'),180);
    setTimeout(()=>performMapRefresh(reason+'-2'),720);
    setTimeout(()=>performMapRefresh(reason+'-3'),1400);
  }

  document.addEventListener('click',event=>{
    const integrated=event.target.closest?.('#v082AgendaTodayButton');
    if(integrated)return;

    const maybeToday=event.target.closest?.('button,[role="button"],a,.btn,.button,div,span');
    if(maybeToday&&norm(maybeToday.value||maybeToday.textContent)==='Hoje'&&agendaRoot()&&!document.getElementById('agendaProductivity')?.contains(maybeToday)){
      event.preventDefault();
      event.stopImmediatePropagation();
      ensureAgendaToday();
      handleToday();
      return;
    }

    const nav=event.target.closest?.('.nav-item,[data-view],[data-section],[onclick*="showSection"],[onclick*="navigate"]');
    if(nav){
      setTimeout(ensureAgendaToday,120);
      setTimeout(ensureAgendaToday,420);
      const text=norm(nav.textContent).toLowerCase();
      const view=norm(nav.getAttribute?.('data-view')).toLowerCase();
      if(view==='mapa'||text.includes('mapa'))scheduleMapRefresh('navigation');
    }
  },true);

  window.addEventListener('betel:real-data-ready',()=>scheduleMapRefresh('real-data'));
  window.addEventListener('betel:map-data-ready',()=>scheduleMapRefresh('map-data'));
  window.addEventListener('betel:opportunities-synced',()=>scheduleMapRefresh('sync'));
  window.addEventListener('pageshow',()=>{
    setTimeout(ensureAgendaToday,180);
    setTimeout(ensureAgendaToday,700);
    scheduleMapRefresh('pageshow');
  });
  window.addEventListener('resize',()=>{
    if(mapVisible())setTimeout(()=>performMapRefresh('resize'),260);
  },{passive:true});

  const observer=new MutationObserver(mutations=>{
    if(!mutations.some(m=>m.type==='childList'))return;
    if(document.getElementById('agendaProductivity'))setTimeout(ensureAgendaToday,40);
  });

  function start(){
    if(!document.body){setTimeout(start,40);return}
    installStyles();
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(ensureAgendaToday,250);
    setTimeout(ensureAgendaToday,900);
    scheduleMapRefresh('boot');
    document.body.setAttribute('data-betel-map-agenda-fix',BUILD);
  }

  start();
  window.__BETEL_MAP_AGENDA_FINAL_FIX__={build:BUILD,refreshMap:()=>scheduleMapRefresh('manual'),refreshAgenda:ensureAgendaToday};
})();
