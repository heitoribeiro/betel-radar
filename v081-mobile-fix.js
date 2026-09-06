/* Betel Radar v0.8.1 — fix mobile Agenda build 8108 */
(function(){
  function getFollowCard(){
    const buttons=[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null&&b.textContent.trim()==='Abrir ficha');
    if(!buttons.length)return null;
    const vw=window.innerWidth;
    let el=buttons[0].parentElement;
    while(el&&el!==document.body){
      const r=el.getBoundingClientRect();
      if(r.width>=vw*.76&&r.width<=vw*.98&&r.height>=120&&r.height<=520)return el;
      el=el.parentElement;
    }
    return null;
  }
  function applyAgendaMobile(){
    const mobile=window.matchMedia('(max-width:760px)').matches||window.innerWidth<=760;
    if(!mobile)return;
    const box=document.getElementById('agendaProductivity');if(!box)return;
    const head=box.querySelector('.v081-head'),grid=box.querySelector('.v081-kpis'),cards=[...box.querySelectorAll('.v081-kpi')],actions=box.querySelector('.v081-actions'),button=box.querySelector('.v081-export');
    const target=getFollowCard();
    if(target){
      const tr=target.getBoundingClientRect(),br=box.getBoundingClientRect();
      const width=Math.round(tr.width),left=Math.round(tr.left-br.left);
      if(Math.abs(br.width-width)>1)box.style.setProperty('width',width+'px','important');
      box.style.setProperty('max-width',width+'px','important');
      box.style.setProperty('min-width',width+'px','important');
      box.style.setProperty('box-sizing','border-box','important');
      box.style.setProperty('position','relative','important');
      const currentLeft=parseFloat(getComputedStyle(box).left)||0;
      if(Math.abs(currentLeft-left)>1)box.style.setProperty('left',left+'px','important');
      box.style.setProperty('margin-left','0','important');box.style.setProperty('margin-right','0','important');
    }
    if(head)head.style.setProperty('padding','10px 11px','important');
    if(grid){grid.style.setProperty('display','grid','important');grid.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important');grid.style.setProperty('gap','6px','important');grid.style.setProperty('padding','8px','important');grid.style.setProperty('width','100%','important');grid.style.setProperty('box-sizing','border-box','important')}
    cards.forEach(card=>{card.style.setProperty('min-height','62px','important');card.style.setProperty('padding','8px 5px 7px 8px','important');card.style.setProperty('border-radius','11px','important');card.style.setProperty('justify-content','center','important');card.style.setProperty('box-sizing','border-box','important');const label=card.querySelector('span'),value=card.querySelector('b'),small=card.querySelector('small');if(label){label.style.setProperty('font-size','9px','important');label.style.setProperty('line-height','1.1','important');label.style.setProperty('margin-bottom','3px','important')}if(value){value.style.setProperty('font-size','21px','important');value.style.setProperty('line-height','1','important')}if(small)small.style.setProperty('display','none','important')});
    if(actions){actions.style.setProperty('padding','0 8px 8px','important');actions.style.setProperty('display','block','important')}
    if(button){button.style.setProperty('width','100%','important');button.style.setProperty('padding','9px 10px','important');button.style.setProperty('font-size','12px','important');button.style.setProperty('border-radius','10px','important')}
  }
  function schedule(){requestAnimationFrame(applyAgendaMobile);setTimeout(applyAgendaMobile,140);setTimeout(applyAgendaMobile,520)}
  document.addEventListener('click',schedule,true);
  window.addEventListener('resize',schedule);
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  setTimeout(schedule,500);
})();