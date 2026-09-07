/* Betel Radar v0.8.2 — estabilização de fluxo e fechamento da ficha, build 8218 */
(function(){
  const BUILD='8218';
  let timer=null;
  let lastSheet=null;
  let closing=false;

  function norm(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function visible(el){
    if(!el||!(el instanceof Element))return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')return false;
    const r=el.getBoundingClientRect();
    return r.width>40&&r.height>40&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth
  }
  function closeSelector(){return '[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]'}
  function alphaBg(el){
    const bg=getComputedStyle(el).backgroundColor||'';
    if(!bg||bg==='transparent')return 0;
    const m=bg.match(/rgba?\(([^)]+)\)/i);if(!m)return 1;
    const p=m[1].split(',').map(x=>x.trim());return p.length>3?Number(p[3])||0:1
  }
  function radius(el){const cs=getComputedStyle(el);return Math.max(parseFloat(cs.borderTopLeftRadius)||0,parseFloat(cs.borderTopRightRadius)||0)}

  function neutralizeLegacyHostCss(){
    const style=document.getElementById('v082OpportunityDetailStyles');
    if(!style)return false;
    const bad='.v082-detail-host{display:block!important;grid-template-columns:minmax(0,1fr)!important;flex-direction:column!important;align-items:stretch!important;overflow-x:hidden!important;max-width:100vw!important;width:100%!important;box-sizing:border-box!important}';
    const badChildren='.v082-detail-host>*{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}';
    if(style.textContent.includes(bad))style.textContent=style.textContent.replace(bad,'.v082-detail-host{min-width:0!important;overflow-x:hidden!important}');
    if(style.textContent.includes(badChildren))style.textContent=style.textContent.replace(badChildren,'.v082-detail-host>*{min-width:0!important;box-sizing:border-box!important}');
    return true
  }

  function installStyles(){
    document.getElementById('v082DetailFlowStyles')?.remove();
    const s=document.createElement('style');s.id='v082DetailFlowStyles';s.textContent=`
      .v082-detail-flow-host{min-width:0!important;overflow-x:hidden!important}
      .v082-detail-flow-host>#v082SourceDetailPanel,.v082-detail-flow-host>#v082ProspectingPanel{position:relative!important;float:none!important;clear:both!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;z-index:auto!important;box-sizing:border-box!important}
      @media(max-width:760px){
        .v082-detail-flow-host>#v082SourceDetailPanel,.v082-detail-flow-host>#v082ProspectingPanel{display:block!important;width:calc(100% - 32px)!important;max-width:calc(100% - 32px)!important;min-width:0!important;margin-left:16px!important;margin-right:16px!important}
        .v082-detail-flow-host>#v082SourceDetailPanel{margin-top:18px!important;margin-bottom:12px!important}
        .v082-detail-flow-host>#v082ProspectingPanel{margin-top:0!important;margin-bottom:28px!important}
      }
    `;document.head.appendChild(s)
  }

  function titleLabels(){return [...document.querySelectorAll('div,span,p,small')].filter(el=>visible(el)&&/^ficha da oportunidade$/i.test(norm(el.textContent)))}
  function candidateScore(el,depth){
    const r=el.getBoundingClientRect();
    if(r.width<Math.min(300,innerWidth*.70)||r.height<220)return -Infinity;
    const cs=getComputedStyle(el);let score=Math.max(0,36-depth*2);
    if(el.querySelector(closeSelector()))score+=28;
    if(alphaBg(el)>.75)score+=58;
    if(radius(el)>=12)score+=48;
    if(r.top>40)score+=36;
    if(r.width>=innerWidth*.84&&r.width<=innerWidth*1.04)score+=24;
    if(['fixed','absolute','sticky'].includes(cs.position))score+=16;
    if(r.top<=2&&r.height>=innerHeight*.94)score-=85;
    if(/overlay|backdrop/i.test(`${el.id||''} ${el.className||''}`))score-=45;
    return score
  }
  function findDetailSheet(){
    let best=null,bestScore=-Infinity;
    for(const label of titleLabels()){
      let el=label.parentElement,depth=0;
      while(el&&el!==document.body){
        const score=candidateScore(el,depth++);
        if(score>bestScore){best=el;bestScore=score}
        el=el.parentElement
      }
    }
    if(best){lastSheet=best;return best}
    if(lastSheet?.isConnected)return lastSheet;
    return null
  }
  function currentOpId(sheet){
    if(!sheet||!Array.isArray(window.opportunities))return null;
    const headings=[...sheet.querySelectorAll('h1,h2,h3,h4,strong,b')].filter(el=>!el.closest('#v082SourceDetailPanel,#v082ProspectingPanel'));
    const titles=new Set(headings.map(el=>norm(el.textContent)).filter(Boolean));
    const op=window.opportunities.find(o=>titles.has(norm(o?.title)));
    return op?.id??sheet.dataset?.v082OpportunityId??null
  }
  function pickPanel(id,sheet,opId){
    const all=[...document.querySelectorAll(`[id="${id}"]`)];
    if(!all.length)return null;
    let chosen=all.find(p=>opId!==null&&String(p.dataset?.v082OpId||'')===String(opId))||all.find(p=>sheet.contains(p))||all[all.length-1];
    all.forEach(p=>{if(p!==chosen)p.remove()});
    return chosen
  }
  function repair(){
    neutralizeLegacyHostCss();installStyles();
    const sheet=findDetailSheet();if(!sheet)return false;
    const opId=currentOpId(sheet);
    const origin=pickPanel('v082SourceDetailPanel',sheet,opId);
    const prospect=pickPanel('v082ProspectingPanel',sheet,opId);
    document.querySelectorAll('.v082-detail-flow-host,.v082-detail-host').forEach(el=>{if(el!==sheet)el.classList.remove('v082-detail-flow-host','v082-detail-host')});
    sheet.classList.add('v082-detail-flow-host','v082-detail-host');
    if(opId!==null)sheet.dataset.v082OpportunityId=String(opId);
    if(origin&&origin.parentElement!==sheet)sheet.appendChild(origin);
    if(prospect){
      if(origin&&origin.parentElement===sheet){if(prospect.parentElement!==sheet||prospect.previousElementSibling!==origin)origin.insertAdjacentElement('afterend',prospect)}
      else if(prospect.parentElement!==sheet)sheet.appendChild(prospect)
    }
    return true
  }
  function schedule(){clearTimeout(timer);[0,45,130,300,620,950].forEach(ms=>setTimeout(repair,ms))}
  function cleanup(){
    document.querySelectorAll('.v082-detail-flow-host,.v082-detail-host').forEach(el=>el.classList.remove('v082-detail-flow-host','v082-detail-host'));
    lastSheet=null
  }
  function isDetailClose(btn){
    if(!btn)return false;
    const sheet=findDetailSheet();if(!sheet)return false;
    if(sheet.contains(btn))return true;
    const br=btn.getBoundingClientRect(),sr=sheet.getBoundingClientRect();
    return br.right>=sr.right-110&&br.left<=sr.right+18&&br.top>=sr.top-18&&br.top<=sr.top+150
  }
  function ensureClosed(sheet){
    setTimeout(()=>{
      if(!sheet?.isConnected||!visible(sheet)){cleanup();return}
      document.querySelectorAll('.v082-detail-host').forEach(el=>el.classList.remove('v082-detail-host'));
      neutralizeLegacyHostCss();
      if(typeof window.closeDetail==='function'&&!closing){
        closing=true;
        try{window.closeDetail()}catch{}
        setTimeout(()=>{closing=false;cleanup()},140)
      }
    },90)
  }

  window.addEventListener('betel:detail-context',schedule);
  window.addEventListener('betel:real-data-ready',()=>setTimeout(repair,180));
  window.addEventListener('pageshow',()=>{neutralizeLegacyHostCss();setTimeout(repair,420)});
  document.addEventListener('click',e=>{
    const open=e.target.closest?.('[onclick*="openDetail"],.opportunity-card,.radar-card,.visual-card,.kanban-card,.map-popup button');
    if(open){schedule();return}
    const close=e.target.closest?.(closeSelector());
    if(close&&isDetailClose(close)){const sheet=lastSheet||findDetailSheet();setTimeout(()=>cleanup(),40);ensureClosed(sheet)}
  },true);

  neutralizeLegacyHostCss();installStyles();
  setTimeout(neutralizeLegacyHostCss,300);
  window.__BETEL_DETAIL_LAYOUT_FIX__={build:BUILD,repair,findDetailSheet,neutralizeLegacyHostCss};
})();