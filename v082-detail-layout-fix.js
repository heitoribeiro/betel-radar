/* Betel Radar v0.8.2 — correção de fluxo da ficha, build 8217 */
(function(){
  const BUILD='8217';
  let timer=null;

  function norm(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function visible(el){
    if(!el||!(el instanceof Element))return false;
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')return false;
    const r=el.getBoundingClientRect();return r.width>40&&r.height>40&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth
  }
  function closeControl(el){return el?.querySelector?.('[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]')||null}

  function installStyles(){
    if(document.getElementById('v082DetailFlowStyles'))return;
    const s=document.createElement('style');s.id='v082DetailFlowStyles';s.textContent=`
      .v082-detail-flow-host{overflow-x:hidden!important;min-width:0!important}
      .v082-detail-flow-host>#v082SourceDetailPanel,.v082-detail-flow-host>#v082ProspectingPanel{position:relative!important;float:none!important;clear:both!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;z-index:auto!important;box-sizing:border-box!important}
      @media(max-width:760px){
        .v082-detail-flow-host>#v082SourceDetailPanel,.v082-detail-flow-host>#v082ProspectingPanel{display:block!important;width:calc(100% - 32px)!important;max-width:calc(100% - 32px)!important;min-width:0!important;margin-left:16px!important;margin-right:16px!important}
        .v082-detail-flow-host>#v082SourceDetailPanel{margin-top:18px!important;margin-bottom:12px!important}
        .v082-detail-flow-host>#v082ProspectingPanel{margin-top:0!important;margin-bottom:28px!important}
      }
    `;document.head.appendChild(s)
  }

  function findDetailSheet(){
    const labels=[...document.querySelectorAll('div,span,p,small')].filter(el=>visible(el)&&/^ficha da oportunidade$/i.test(norm(el.textContent)));
    for(const label of labels){
      let el=label.parentElement;
      while(el&&el!==document.body){
        const r=el.getBoundingClientRect();
        if(closeControl(el)&&r.width>=Math.min(300,innerWidth*.72)&&r.height>=220)return el;
        el=el.parentElement
      }
    }
    const closes=[...document.querySelectorAll('[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]')].filter(visible);
    for(const close of closes){
      let el=close.parentElement;
      while(el&&el!==document.body){
        const r=el.getBoundingClientRect();
        if(r.width>=Math.min(300,innerWidth*.72)&&r.height>=220&&/ficha da oportunidade/i.test(norm(el.textContent)))return el;
        el=el.parentElement
      }
    }
    return null
  }

  function repair(){
    installStyles();
    const sheet=findDetailSheet();if(!sheet)return false;
    const origin=document.getElementById('v082SourceDetailPanel');
    const prospect=document.getElementById('v082ProspectingPanel');
    document.querySelectorAll('.v082-detail-flow-host').forEach(el=>{if(el!==sheet)el.classList.remove('v082-detail-flow-host')});
    document.querySelectorAll('.v082-detail-host').forEach(el=>{if(el!==sheet)el.classList.remove('v082-detail-host')});
    sheet.classList.add('v082-detail-flow-host','v082-detail-host');
    if(origin&&origin.parentElement!==sheet)sheet.appendChild(origin);
    if(prospect){
      if(origin&&origin.parentElement===sheet){if(prospect.parentElement!==sheet||prospect.previousElementSibling!==origin)origin.insertAdjacentElement('afterend',prospect)}
      else if(prospect.parentElement!==sheet)sheet.appendChild(prospect)
    }
    if(origin?.dataset?.v082OpId)sheet.dataset.v082OpportunityId=origin.dataset.v082OpId;
    return true
  }
  function schedule(){clearTimeout(timer);[0,60,180,420,800].forEach(ms=>setTimeout(repair,ms))}
  function cleanup(){document.querySelectorAll('.v082-detail-flow-host').forEach(el=>el.classList.remove('v082-detail-flow-host'))}

  window.addEventListener('betel:detail-context',schedule);
  window.addEventListener('betel:real-data-ready',()=>setTimeout(repair,180));
  window.addEventListener('pageshow',()=>setTimeout(repair,450));
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[onclick*="openDetail"],.opportunity-card,.radar-card,.visual-card,.kanban-card,.map-popup button'))schedule();
    if(e.target.closest?.('[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]'))setTimeout(cleanup,80)
  },true);

  installStyles();
  window.__BETEL_DETAIL_LAYOUT_FIX__={build:BUILD,repair,findDetailSheet};
})();