/* Betel Radar v0.8.2 — recuperação estrutural do layout desktop/desktop-site, build 8238 */
(function(){
  'use strict';

  const BUILD='8238';
  const MOBILE_MAX=760;
  let scheduled=false;
  let recoveryApplied=false;

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

  function clearLegacyOffsets(){
    if(!document.body)return;
    ['padding-left','margin-left','box-sizing','overflow-x'].forEach(p=>document.body.style.removeProperty(p));
    document.documentElement.style.removeProperty('overflow-x');
    document.body.removeAttribute('data-betel-desktop-sidebar-reserved');

    const top=topbar();
    if(top){
      ['left','right','width','max-width','box-sizing','margin-left'].forEach(p=>top.style.removeProperty(p));
    }
  }

  function containsMainSignal(el){
    if(!el||!(el instanceof Element))return false;
    if(el.matches('main,.main,.main-content,.content,.app-content,.workspace'))return true;
    return !!el.querySelector('.topbar,main,.main,.main-content,.content-view,.view,[data-view]');
  }

  function findLayoutPair(side){
    let branch=side;
    let parent=side.parentElement;

    for(let depth=0;parent&&depth<7;depth++){
      const siblings=[...parent.children].filter(el=>el!==branch);
      let main=siblings.find(containsMainSignal);

      if(!main){
        main=siblings
          .filter(el=>el instanceof Element)
          .map(el=>({el,r:el.getBoundingClientRect(),score:(el.scrollHeight||0)+(el.textContent||'').length}))
          .filter(x=>x.r.width>80&&x.r.height>120)
          .sort((a,b)=>b.score-a.score)[0]?.el||null;
      }

      if(main)return {root:parent,sideBranch:branch,mainBranch:main};
      branch=parent;
      parent=parent.parentElement;
    }
    return null;
  }

  function geometryIsBroken(side,pair){
    if(!pair)return false;
    const sr=side.getBoundingClientRect();
    const mr=pair.mainBranch.getBoundingClientRect();
    const vw=Math.max(window.innerWidth,1);

    return sr.left>8 ||
      mr.left < sr.right-8 ||
      mr.width < vw*.42 ||
      mr.right > vw*1.12;
  }

  function forceDesktopGrid(side,pair){
    const {root,sideBranch,mainBranch}=pair;
    const sr=side.getBoundingClientRect();
    const sideWidth=(sr.width>=210&&sr.width<=360)?Math.round(sr.width):280;

    root.style.setProperty('display','grid','important');
    root.style.setProperty('grid-template-columns',sideWidth+'px minmax(0,1fr)','important');
    root.style.setProperty('grid-template-rows','minmax(100vh,auto)','important');
    root.style.setProperty('align-items','start','important');
    root.style.setProperty('width','100%','important');
    root.style.setProperty('max-width','none','important');
    root.style.setProperty('min-width','0','important');
    root.style.setProperty('margin-left','0','important');
    root.style.setProperty('margin-right','0','important');
    root.style.setProperty('transform','none','important');
    root.style.setProperty('box-sizing','border-box','important');

    sideBranch.style.setProperty('grid-column','1','important');
    sideBranch.style.setProperty('grid-row','1','important');
    sideBranch.style.setProperty('width',sideWidth+'px','important');
    sideBranch.style.setProperty('min-width',sideWidth+'px','important');
    sideBranch.style.setProperty('max-width',sideWidth+'px','important');
    sideBranch.style.setProperty('margin','0','important');
    sideBranch.style.setProperty('transform','none','important');

    side.style.setProperty('position','sticky','important');
    side.style.setProperty('top','0','important');
    side.style.setProperty('left','auto','important');
    side.style.setProperty('right','auto','important');
    side.style.setProperty('bottom','auto','important');
    side.style.setProperty('transform','none','important');
    side.style.setProperty('margin-left','0','important');
    side.style.setProperty('width','100%','important');
    side.style.setProperty('max-width','100%','important');
    side.style.setProperty('height','100vh','important');
    side.style.setProperty('height','100dvh','important');
    side.style.setProperty('max-height','100dvh','important');
    side.style.setProperty('overflow-y','auto','important');
    side.style.setProperty('box-sizing','border-box','important');
    side.style.setProperty('pointer-events','auto','important');
    side.style.setProperty('visibility','visible','important');
    side.removeAttribute('aria-hidden');

    mainBranch.style.setProperty('grid-column','2','important');
    mainBranch.style.setProperty('grid-row','1','important');
    mainBranch.style.setProperty('min-width','0','important');
    mainBranch.style.setProperty('width','auto','important');
    mainBranch.style.setProperty('max-width','none','important');
    mainBranch.style.setProperty('margin-left','0','important');
    mainBranch.style.setProperty('margin-right','0','important');
    mainBranch.style.setProperty('transform','none','important');
    mainBranch.style.setProperty('box-sizing','border-box','important');

    const top=topbar();
    if(top&&mainBranch.contains(top)){
      top.style.setProperty('position','sticky','important');
      top.style.setProperty('top','0','important');
      top.style.setProperty('left','auto','important');
      top.style.setProperty('right','auto','important');
      top.style.setProperty('width','100%','important');
      top.style.setProperty('max-width','none','important');
      top.style.setProperty('box-sizing','border-box','important');
    }

    recoveryApplied=true;
    document.body.setAttribute('data-betel-desktop-layout',BUILD);
    document.documentElement.style.setProperty('overflow-x','hidden','important');
    document.body.style.setProperty('overflow-x','hidden','important');
  }

  function apply(){
    scheduled=false;
    if(!document.body)return;
    clearLegacyOffsets();
    if(!isDesktop()){
      document.body.removeAttribute('data-betel-desktop-layout');
      return;
    }

    const side=sidebar();
    if(!visible(side))return;
    const pair=findLayoutPair(side);
    if(!pair)return;

    if(geometryIsBroken(side,pair))forceDesktopGrid(side,pair);
    else{
      document.body.setAttribute('data-betel-desktop-layout',BUILD+'-native');
      document.documentElement.style.setProperty('overflow-x','hidden','important');
      document.body.style.setProperty('overflow-x','hidden','important');
    }
  }

  function schedule(delay=0){
    if(delay){setTimeout(()=>schedule(),delay);return}
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  function reevaluate(){schedule();schedule(120);schedule(420)}

  window.addEventListener('resize',reevaluate,{passive:true});
  window.addEventListener('orientationchange',()=>schedule(120),{passive:true});
  window.addEventListener('pageshow',()=>{schedule();schedule(180);schedule(700)});
  window.addEventListener('betel:real-data-ready',()=>{schedule();schedule(180)});
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
  window.__BETEL_DESKTOP_LAYOUT_FIX__={build:BUILD,apply,reevaluate,isRecoveryApplied:()=>recoveryApplied};
})();
