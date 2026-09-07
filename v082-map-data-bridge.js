/* Betel Radar v0.8.2 — ponte de dados do mapa, build 8211 */
(function(){
  const BUILD='8211';
  let timer=null;

  function currentOps(){
    return Array.isArray(window.opportunities)?window.opportunities:[];
  }

  function syncLegacyBinding(){
    try{
      window.eval('if (typeof opportunities !== "undefined") opportunities = window.opportunities');
      return true;
    }catch(e){
      console.warn('Betel Radar: não foi possível sincronizar o binding legado de opportunities',e);
      return false;
    }
  }

  function bridge(reason='manual'){
    const list=currentOps();
    const bridged=syncLegacyBinding();
    const withCoords=list.filter(o=>Array.isArray(o?.coords)&&o.coords.length===2&&o.coords.every(v=>Number.isFinite(Number(v))));

    window.__BETEL_MAP_DATA_BRIDGE__={
      build:BUILD,
      reason,
      total:list.length,
      withCoords:withCoords.length,
      bridged,
      updatedAt:new Date().toISOString()
    };

    if(typeof window.renderAll==='function'){
      try{window.renderAll()}catch(e){console.warn('Betel Radar: falha ao rerenderizar após sincronização do mapa',e)}
    }

    window.dispatchEvent(new CustomEvent('betel:map-data-ready',{detail:{build:BUILD,total:list.length,withCoords:withCoords.length,bridged}}));
  }

  function schedule(reason,delay=80){
    clearTimeout(timer);
    timer=setTimeout(()=>bridge(reason),delay);
  }

  window.addEventListener('betel:real-data-ready',()=>schedule('real-data-ready',40));
  window.addEventListener('betel:opportunities-synced',()=>schedule('opportunities-synced',120));
  window.addEventListener('pageshow',()=>schedule('pageshow',500));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule('visibility',120)});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.nav-item,.bottom-nav,.mobile-bottom-nav,[data-section],[onclick*="showSection"],[onclick*="navigate"]'))schedule('navigation',220)
  },true);

  setTimeout(()=>schedule('boot',0),900);
})();
