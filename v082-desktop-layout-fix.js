/* Betel Radar v0.8.2 — layout desktop/desktop-site sem dupla reserva, build 8237 */
(function(){
  'use strict';

  const BUILD='8237';
  const MOBILE_MAX=760;
  let scheduled=false;
  let contentState=null;
  let topState=null;

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

  function clear8236Residue(){
    const body=document.body;
    if(!body)return;
    if(body.hasAttribute('data-betel-desktop-sidebar-reserved')){
      body.style.removeProperty('padding-left');
      body.style.removeProperty('box-sizing');
      body.style.removeProperty('overflow-x');
      document.documentElement.style.removeProperty('overflow-x');
      body.removeAttribute('data-betel-desktop-sidebar-reserved');
      const top=topbar();
      if(top){
        ['left','right','width','max-width','box-sizing'].forEach(p=>top.style.removeProperty(p));
      }
    }
  }

  function restoreContentAdjustments(){
    if(contentState){restoreInline(contentState.el,contentState.styles);contentState=null}
    if(topState){restoreInline(topState.el,topState.styles);topState=null}
  }

  function normalizeSidebar(side){
    side.style.setProperty('position','fixed','important');
    side.style.setProperty('left','0','important');
    side.style.setProperty('top','0','important');
    side.style.setProperty('bottom','0','important');
    side.style.setProperty('height','100vh','important');
    side.style.setProperty('height','100dvh','important');
    side.style.setProperty('margin-left','0','important');
    side.style.setProperty('overflow-y','auto','important');
    side.style.setProperty('transform','none','important');

    /* Alguns navegadores em “site para computador” criam um containing block
       que desloca o fixed. Corrigimos somente se ele realmente ficou à direita. */
    const first=side.getBoundingClientRect();
    if(first.left>2){
      side.style.setProperty('transform',`translateX(-${Math.round(first.left)}px)`,'important');
    }
  }

  function findContentSibling(side){
    let parent=side.parentElement;
    for(let depth=0;parent&&parent!==document.body&&depth<4;depth++,parent=parent.parentElement){
      const candidates=[...parent.children].filter(el=>el!==side&&visible(el));
      const hit=candidates.find(el=>{
        const r=el.getBoundingClientRect();
        return r.width>window.innerWidth*.45&&r.height>180;
      });
      if(hit)return hit;
    }
    const selectors=['.main-content','.main','.content','main','.app-content','.workspace'];
    for(const sel of selectors){
      const el=[...document.querySelectorAll(sel)].find(el=>visible(el)&&!el.contains(side));
      if(el)return el;
    }
    return null;
  }

  function reserveOnlyIfOverlapping(side){
    const sr=side.getBoundingClientRect();
    if(sr.width<120||sr.left>4)return;

    const content=findContentSibling(side);
    if(content){
      const cr=content.getBoundingClientRect();
      if(cr.left < sr.right-8){
        contentState={el:content,styles:saveInline(content,['margin-left','width','max-width','box-sizing'])};
        const reserve=Math.ceil(sr.width);
        content.style.setProperty('margin-left',reserve+'px','important');
        content.style.setProperty('width',`calc(100% - ${reserve}px)`,'important');
        content.style.setProperty('max-width','none','important');
        content.style.setProperty('box-sizing','border-box','important');
      }
    }

    const top=topbar();
    if(visible(top)){
      const tr=top.getBoundingClientRect();
      if(tr.left < sr.right-8 && getComputedStyle(top).position==='fixed'){
        topState={el:top,styles:saveInline(top,['left','right','width','max-width','box-sizing'])};
        const reserve=Math.ceil(sr.width);
        top.style.setProperty('left',reserve+'px','important');
        top.style.setProperty('right','0','important');
        top.style.setProperty('width','auto','important');
        top.style.setProperty('max-width','none','important');
        top.style.setProperty('box-sizing','border-box','important');
      }
    }
  }

  function apply(){
    scheduled=false;
    if(!document.body)return;
    clear8236Residue();
    restoreContentAdjustments();
    if(!isDesktop())return;

    const side=sidebar();
    if(!visible(side))return;
    normalizeSidebar(side);
    reserveOnlyIfOverlapping(side);

    document.documentElement.style.setProperty('overflow-x','hidden','important');
    document.body.style.setProperty('overflow-x','hidden','important');
    document.body.setAttribute('data-betel-desktop-layout',BUILD);
  }

  function schedule(delay=0){
    if(delay){setTimeout(()=>schedule(0),delay);return}
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  function reevaluate(){schedule();schedule(120);schedule(420)}

  window.addEventListener('resize',reevaluate,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(reevaluate,120),{passive:true});
  window.addEventListener('pageshow',()=>{schedule();schedule(180);schedule(700)});
  window.addEventListener('betel:real-data-ready',()=>{schedule();schedule(200)});
  document.addEventListener('click',()=>schedule(80),true);

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&m.attributeName==='class')))schedule();
  });
  function start(){
    if(!document.body){setTimeout(start,40);return}
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    schedule();schedule(150);schedule(600);schedule(1400);
  }
  start();

  window.__BETEL_DESKTOP_LAYOUT_FIX__={build:BUILD,apply,reevaluate};
})();
