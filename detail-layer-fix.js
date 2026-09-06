/* Betel Radar v0.8.1 — correção de camadas ficha x mapa build 8110 */
(function(){
  function isVisible(el){
    if(!el || !(el instanceof Element)) return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0') return false;
    const r=el.getBoundingClientRect();
    return r.width>40&&r.height>40&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
  }
  function liftDetailLayers(){
    document.body.classList.add('betel-detail-open');
    const map=document.getElementById('opportunityMap');
    if(map){
      map.style.setProperty('z-index','0','important');
    }
    const candidates=[...document.querySelectorAll('body *')].filter(el=>{
      if(!isVisible(el)) return false;
      if(el.closest('#opportunityMap,.leaflet-container,.leaflet-pane,.leaflet-control-container')) return false;
      if(el.closest('.sidebar,.topbar,.bottom-nav,.mobile-bottom-nav')) return false;
      const cs=getComputedStyle(el);
      const r=el.getBoundingClientRect();
      const large=r.width>=innerWidth*.55 || r.height>=innerHeight*.45;
      const modalish=/modal|dialog|detail|drawer|sheet|backdrop|overlay/i.test(String(el.id)+' '+String(el.className));
      return (cs.position==='fixed'||cs.position==='absolute') && (large||modalish);
    });
    candidates.forEach(el=>{
      el.dataset.betelPrevZ=el.style.zIndex||'';
      el.style.setProperty('z-index','2147483400','important');
      if(/backdrop|overlay/i.test(String(el.id)+' '+String(el.className))){
        el.style.setProperty('z-index','2147483300','important');
      }
    });
  }
  function restoreDetailLayers(){
    document.body.classList.remove('betel-detail-open');
    document.querySelectorAll('[data-betel-prev-z]').forEach(el=>{
      const prev=el.dataset.betelPrevZ;
      el.style.removeProperty('z-index');
      if(prev) el.style.zIndex=prev;
      delete el.dataset.betelPrevZ;
    });
  }
  function installWrap(){
    if(typeof window.openDetail==='function'&&!window.openDetail.__betelLayerWrapped){
      const original=window.openDetail;
      const wrapped=function(){
        const r=original.apply(this,arguments);
        requestAnimationFrame(liftDetailLayers);
        setTimeout(liftDetailLayers,60);
        setTimeout(liftDetailLayers,220);
        return r;
      };
      wrapped.__betelLayerWrapped=true;
      window.openDetail=wrapped;
    }
    if(typeof window.closeDetail==='function'&&!window.closeDetail.__betelLayerWrapped){
      const original=window.closeDetail;
      const wrapped=function(){
        const r=original.apply(this,arguments);
        setTimeout(restoreDetailLayers,0);
        return r;
      };
      wrapped.__betelLayerWrapped=true;
      window.closeDetail=wrapped;
    }
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('.leaflet-popup-content button,.map-popup button,[onclick*="openDetail"]')){
      setTimeout(liftDetailLayers,80);
      setTimeout(liftDetailLayers,250);
    }
    if(e.target.closest('[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"]')){
      setTimeout(restoreDetailLayers,80);
    }
  },true);
  installWrap();
  setTimeout(installWrap,300);
  setTimeout(installWrap,1000);
})();
