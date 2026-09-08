/* Betel Radar v0.8.2 — botão Hoje único na Agenda, build 8242 */
(function(){
  'use strict';

  const BUILD='8242';
  let scheduled=false;

  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();

  function installStyles(){
    if(document.getElementById('v082AgendaTodayDedupStyles'))return;
    const s=document.createElement('style');
    s.id='v082AgendaTodayDedupStyles';
    s.textContent=`
      #agendaProductivity .v082-agenda-today:not(#v082AgendaTodayButton),
      #agendaProductivity [data-v082-agenda-duplicate-today="1"]{
        display:none!important;
      }
    `;
    document.head.appendChild(s);
  }

  function cleanup(){
    scheduled=false;
    installStyles();

    const box=document.getElementById('agendaProductivity');
    if(!box)return false;
    const actions=box.querySelector('.v081-actions');
    if(!actions)return false;

    if(!document.getElementById('v082AgendaTodayButton')){
      try{window.__BETEL_MAP_AGENDA_FINAL_FIX__?.refreshAgenda?.()}catch{}
    }

    const preferred=document.getElementById('v082AgendaTodayButton');
    const candidates=[...actions.querySelectorAll('button,[role="button"],a,.btn,.button')]
      .filter(el=>norm(el.value||el.textContent)==='Hoje');

    for(const el of candidates){
      if(el===preferred){
        el.removeAttribute('data-v082-agenda-duplicate-today');
        el.removeAttribute('aria-hidden');
        el.removeAttribute('tabindex');
        continue;
      }
      el.setAttribute('data-v082-agenda-duplicate-today','1');
      el.setAttribute('aria-hidden','true');
      el.setAttribute('tabindex','-1');
    }

    document.body?.setAttribute('data-betel-agenda-today-dedup',BUILD);
    return !!preferred;
  }

  function schedule(delay=0){
    if(delay){setTimeout(()=>schedule(),delay);return}
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(cleanup);
  }

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&(m.attributeName==='class'||m.attributeName==='style'))))schedule(30);
  });

  function start(){
    if(!document.body){setTimeout(start,40);return}
    installStyles();
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    schedule();schedule(120);schedule(420);schedule(900);
  }

  document.addEventListener('click',event=>{
    const nav=event.target.closest?.('.nav-item,[data-view],[data-section],[onclick*="showSection"],[onclick*="navigate"]');
    if(nav){schedule(80);schedule(260)}
  },true);
  window.addEventListener('pageshow',()=>{schedule();schedule(220)});
  window.addEventListener('focus',()=>schedule(100));

  start();
  window.__BETEL_AGENDA_TODAY_DEDUP__={build:BUILD,refresh:()=>schedule()};
})();
