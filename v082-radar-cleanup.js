/* Betel Radar v0.8.2 — consolida Radar e aposenta Radar Visual, build 8227 */
(function(){
  const BUILD='8227';
  let queued=false;
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const clean=v=>norm(v).replace(/[✨🌟]/g,'').trim().toLowerCase();

  function navScopes(){
    return [...document.querySelectorAll('.sidebar,nav,.menu,.drawer,.mobile-menu,.side-menu,[role="navigation"]')];
  }
  function candidates(scope){
    return [...scope.querySelectorAll('.nav-item,a,button,li,[role="button"],[data-view],[data-section]')];
  }
  function isRadarVisual(el){
    if(!el)return false;
    const text=clean(el.textContent);
    const view=clean(el.getAttribute?.('data-view'));
    const section=clean(el.getAttribute?.('data-section'));
    return text==='radar visual'||view==='radarvisual'||view==='radar-visual'||view==='radar_visual'||section==='radarvisual'||section==='radar-visual'||section==='radar_visual';
  }
  function isRadar(el){
    if(!el)return false;
    const text=clean(el.textContent);
    const view=clean(el.getAttribute?.('data-view'));
    const section=clean(el.getAttribute?.('data-section'));
    return text==='radar'||view==='radar'||section==='radar';
  }
  function hideRadarVisual(){
    let activeVisual=false,radarTarget=null;
    for(const scope of navScopes()){
      for(const el of candidates(scope)){
        if(isRadar(el))radarTarget=radarTarget||el;
        if(!isRadarVisual(el))continue;
        if(el.classList.contains('active')||el.getAttribute('aria-current')==='page')activeVisual=true;
        el.dataset.v082RetiredRadarVisual='1';
        el.setAttribute('aria-hidden','true');
        el.setAttribute('tabindex','-1');
        el.style.setProperty('display','none','important');
      }
    }
    if(activeVisual&&radarTarget){
      try{radarTarget.click()}catch{}
    }
  }
  function run(){queued=false;hideRadarVisual();document.documentElement.dataset.v082RadarCleanup=BUILD}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(run)}
  function boot(){
    schedule();setTimeout(schedule,120);setTimeout(schedule,500);
    const obs=new MutationObserver(schedule);obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-current','data-view','data-section']});
    document.addEventListener('click',e=>{if(e.target.closest?.('.sidebar,nav,.menu,.drawer,.mobile-menu,.side-menu,[role="navigation"]'))setTimeout(schedule,20)},true);
    window.addEventListener('pageshow',schedule);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.__BETEL_RADAR_CLEANUP__={build:BUILD,refresh:schedule};
})();
