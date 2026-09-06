/* Betel Radar v0.8.1 — fix mobile Agenda build 8106 */
(function(){
  function applyAgendaMobile(){
    const mobile=window.matchMedia('(max-width:760px)').matches || window.innerWidth<=760;
    if(!mobile)return;
    const box=document.getElementById('agendaProductivity');
    if(!box)return;
    const head=box.querySelector('.v081-head');
    const grid=box.querySelector('.v081-kpis');
    const cards=[...box.querySelectorAll('.v081-kpi')];
    const actions=box.querySelector('.v081-actions');
    const button=box.querySelector('.v081-export');

    box.style.setProperty('width','100%','important');
    box.style.setProperty('max-width','none','important');
    box.style.setProperty('min-width','0','important');
    box.style.setProperty('box-sizing','border-box','important');
    box.style.setProperty('align-self','stretch','important');
    box.style.setProperty('flex','1 1 100%','important');
    box.style.setProperty('margin-left','0','important');
    box.style.setProperty('margin-right','0','important');

    if(head){head.style.setProperty('padding','10px 11px','important')}
    if(grid){
      grid.style.setProperty('display','grid','important');
      grid.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');
      grid.style.setProperty('gap','6px','important');
      grid.style.setProperty('padding','8px','important');
      grid.style.setProperty('width','100%','important');
      grid.style.setProperty('box-sizing','border-box','important');
    }
    cards.forEach(card=>{
      card.style.setProperty('min-height','62px','important');
      card.style.setProperty('padding','8px 5px 7px 8px','important');
      card.style.setProperty('border-radius','11px','important');
      card.style.setProperty('justify-content','center','important');
      card.style.setProperty('box-sizing','border-box','important');
      const label=card.querySelector('span');
      const value=card.querySelector('b');
      const small=card.querySelector('small');
      if(label){label.style.setProperty('font-size','9px','important');label.style.setProperty('line-height','1.1','important');label.style.setProperty('margin-bottom','3px','important')}
      if(value){value.style.setProperty('font-size','21px','important');value.style.setProperty('line-height','1','important')}
      if(small){small.style.setProperty('display','none','important')}
    });
    if(actions){actions.style.setProperty('padding','0 8px 8px','important');actions.style.setProperty('display','block','important')}
    if(button){button.style.setProperty('width','100%','important');button.style.setProperty('padding','9px 10px','important');button.style.setProperty('font-size','12px','important');button.style.setProperty('border-radius','10px','important')}
  }
  function schedule(){requestAnimationFrame(applyAgendaMobile);setTimeout(applyAgendaMobile,80);setTimeout(applyAgendaMobile,350)}
  document.addEventListener('click',schedule,true);
  window.addEventListener('resize',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  setInterval(applyAgendaMobile,1200);
  setTimeout(schedule,300);
})();
