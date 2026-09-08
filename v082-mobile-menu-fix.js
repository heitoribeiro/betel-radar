/* Betel Radar v0.8.2 — controlador definitivo do menu mobile, build 8234 */
(function(){
  'use strict';

  const BUILD='8234';
  const MOBILE_MAX=760;
  let menuOpen=false;
  let applying=false;

  function isMobile(){return window.innerWidth<=MOBILE_MAX}
  function sidebar(){return document.querySelector('.sidebar')}
  function burger(){
    return document.querySelector('.mobile-menu-btn,[data-menu-toggle],[aria-label*="menu" i],button[title*="menu" i]') ||
      [...document.querySelectorAll('button')].find(b=>/^[☰≡]$/.test((b.textContent||'').trim())) || null;
  }
  function backdrops(){return [...document.querySelectorAll('.sidebar-backdrop,.mobile-overlay,.menu-overlay')];}

  function restoreDocumentScroll(){
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('touch-action');
  }

  function applyState(){
    if(applying)return;
    applying=true;
    try{
      const side=sidebar();
      if(!side)return;

      if(!isMobile()){
        side.style.removeProperty('transform');
        side.style.removeProperty('pointer-events');
        side.style.removeProperty('visibility');
        side.removeAttribute('aria-hidden');
        document.body.classList.remove('betel-menu-open');
        backdrops().forEach(el=>{
          if(el.dataset.betelMenuFix==='1'){
            el.style.removeProperty('display');
            el.style.removeProperty('pointer-events');
            el.style.removeProperty('opacity');
            delete el.dataset.betelMenuFix;
          }
        });
        return;
      }

      side.style.setProperty('transition','transform .22s ease','important');
      side.style.setProperty('will-change','transform','important');
      side.style.setProperty('transform',menuOpen?'translateX(0)':'translateX(calc(-100% - 12px))','important');
      side.style.setProperty('pointer-events',menuOpen?'auto':'none','important');
      side.style.setProperty('visibility','visible','important');
      side.setAttribute('aria-hidden',menuOpen?'false':'true');
      document.body.classList.toggle('betel-menu-open',menuOpen);

      backdrops().forEach(el=>{
        el.dataset.betelMenuFix='1';
        el.style.setProperty('display',menuOpen?'block':'none','important');
        el.style.setProperty('pointer-events',menuOpen?'auto':'none','important');
        el.style.setProperty('opacity',menuOpen?'1':'0','important');
      });

      if(!menuOpen)restoreDocumentScroll();
    }finally{applying=false}
  }

  function openMenu(){if(!isMobile())return;menuOpen=true;applyState()}
  function closeMenu(){menuOpen=false;applyState()}
  function toggleMenu(){if(!isMobile())return;menuOpen?closeMenu():openMenu()}

  function isBurgerTarget(target){
    const btn=target?.closest?.('button,.mobile-menu-btn,[data-menu-toggle]');
    if(!btn)return false;
    const known=burger();
    if(known&&(btn===known||known.contains(btn)||btn.contains(known)))return true;
    const label=((btn.getAttribute('aria-label')||'')+' '+(btn.getAttribute('title')||'')+' '+(btn.textContent||'')).toLowerCase();
    return label.includes('menu')||/[☰≡]/.test(label);
  }

  function isNavTarget(target){
    const el=target?.closest?.('.sidebar .nav-item,.sidebar .menu-item,.sidebar [data-view],.sidebar [data-section],.sidebar a,.sidebar button');
    return !!el && !isBurgerTarget(el);
  }

  document.addEventListener('click',event=>{
    if(!isMobile())return;

    if(isBurgerTarget(event.target)){
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleMenu();
      return;
    }

    if(event.target?.closest?.('.sidebar-backdrop,.mobile-overlay,.menu-overlay')){
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu();
      return;
    }

    if(isNavTarget(event.target)){
      setTimeout(closeMenu,0);
      setTimeout(closeMenu,80);
      setTimeout(closeMenu,260);
    }
  },true);

  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuOpen)closeMenu()},true);
  window.addEventListener('resize',()=>{menuOpen=false;applyState()},{passive:true});
  window.addEventListener('orientationchange',()=>{menuOpen=false;setTimeout(applyState,80)},{passive:true});
  window.addEventListener('pageshow',()=>{menuOpen=false;applyState();setTimeout(applyState,180)});

  const observer=new MutationObserver(()=>{
    if(!isMobile())return;
    requestAnimationFrame(applyState);
  });
  function start(){
    if(!document.body){setTimeout(start,40);return}
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    menuOpen=false;
    applyState();
    setTimeout(applyState,100);
    setTimeout(applyState,500);
  }

  start();
  window.BetelMobileMenu={build:BUILD,open:openMenu,close:closeMenu,toggle:toggleMenu,isOpen:()=>menuOpen};
})();
