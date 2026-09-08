/* Betel Radar v0.8.2 — correção de reserva da sidebar em desktop/desktop-site, build 8236 */
(function(){
  'use strict';

  const BUILD='8236';
  const MOBILE_MAX=760;
  let applied=false;
  let saved=null;
  let scheduled=false;

  function isDesktop(){return window.innerWidth>MOBILE_MAX}
  function sidebar(){return document.querySelector('.sidebar')}
  function topbar(){return document.querySelector('.topbar')}

  function visible(el){
    if(!el||!(el instanceof Element))return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')return false;
    const r=el.getBoundingClientRect();
    return r.width>1&&r.height>1;
  }

  function mainAnchor(){
    const top=topbar();
    if(visible(top))return top;
    const selectors=[
      '.view.active','.content-view.active','.page.active','.panel.active',
      '.view:not([hidden])','.content-view:not([hidden])','main','.main','.content'
    ];
    for(const sel of selectors){
      const el=[...document.querySelectorAll(sel)].find(visible);
      if(el)return el;
    }
    return null;
  }

  function saveInline(el,props){
    const out={};
    props.forEach(p=>out[p]={value:el.style.getPropertyValue(p),priority:el.style.getPropertyPriority(p)});
    return out;
  }
  function restoreInline(el,state){
    if(!el||!state)return;
    Object.entries(state).forEach(([p,v])=>{
      if(v.value)el.style.setProperty(p,v.value,v.priority||'');
      else el.style.removeProperty(p);
    });
  }

  function reset(){
    if(!applied||!saved)return;
    restoreInline(document.body,saved.body);
    restoreInline(document.documentElement,saved.html);
    restoreInline(saved.topEl,saved.top);
    document.body.removeAttribute('data-betel-desktop-sidebar-reserved');
    applied=false;saved=null;
  }

  function apply(){
    scheduled=false;
    if(!document.body)return;
    if(!isDesktop()){reset();return}
    if(applied)return;

    const side=sidebar();
    const anchor=mainAnchor();
    if(!side||!anchor)return;
    const sr=side.getBoundingClientRect();
    const ar=anchor.getBoundingClientRect();
    if(sr.width<140||sr.right<140||sr.left>8)return;

    /*
      Em alguns navegadores no modo “site para computador”, o layout original
      entra no breakpoint intermediário: a sidebar continua fixed, mas deixa de
      reservar sua coluna. O conteúdo então começa em x=0 e fica escondido atrás
      do menu. Só corrigimos quando a geometria comprova essa sobreposição.
    */
    const overlap=ar.left < (sr.right-12);
    if(!overlap)return;

    const reserve=Math.ceil(sr.right);
    const top=topbar();
    saved={
      body:saveInline(document.body,['padding-left','box-sizing','overflow-x']),
      html:saveInline(document.documentElement,['overflow-x']),
      topEl:top,
      top:top?saveInline(top,['left','right','width','max-width','box-sizing']):null
    };

    document.body.style.setProperty('padding-left',reserve+'px','important');
    document.body.style.setProperty('box-sizing','border-box','important');
    document.body.style.setProperty('overflow-x','hidden','important');
    document.documentElement.style.setProperty('overflow-x','hidden','important');
    document.body.setAttribute('data-betel-desktop-sidebar-reserved',String(reserve));

    if(top&&getComputedStyle(top).position==='fixed'){
      top.style.setProperty('left',reserve+'px','important');
      top.style.setProperty('right','0','important');
      top.style.setProperty('width','auto','important');
      top.style.setProperty('max-width','none','important');
      top.style.setProperty('box-sizing','border-box','important');
    }

    side.style.setProperty('left','0','important');
    side.style.setProperty('top','0','important');
    side.style.setProperty('bottom','0','important');
    side.style.setProperty('height','100vh','important');
    side.style.setProperty('height','100dvh','important');
    side.style.setProperty('overflow-y','auto','important');

    applied=true;
    setTimeout(()=>{
      const map=document.getElementById('opportunityMap');
      if(map&&window.L){
        const container=map._leaflet_map||null;
        if(container?.invalidateSize)container.invalidateSize();
      }
    },180);
  }

  function schedule(delay=0){
    if(delay){setTimeout(()=>schedule(0),delay);return}
    if(scheduled)return;scheduled=true;requestAnimationFrame(apply)
  }

  function reevaluate(){
    reset();
    schedule();schedule(120);schedule(420);
  }

  window.addEventListener('resize',reevaluate,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(reevaluate,120),{passive:true});
  window.addEventListener('pageshow',()=>{schedule();schedule(180);schedule(700)});
  window.addEventListener('betel:real-data-ready',()=>{schedule();schedule(200)});
  document.addEventListener('click',()=>schedule(80),true);

  const observer=new MutationObserver(()=>schedule());
  function start(){
    if(!document.body){setTimeout(start,40);return}
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    schedule();schedule(150);schedule(600);schedule(1400);
  }
  start();

  window.__BETEL_DESKTOP_LAYOUT_FIX__={build:BUILD,apply,reset,reevaluate,isApplied:()=>applied};
})();
