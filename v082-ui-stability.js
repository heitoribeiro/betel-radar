/* Betel Radar v0.8.2 — consolidação do Radar + estabilidade das ações, build 8224 */
(function(){
  const BUILD='8224';
  let queued=false;
  let redirecting=false;

  function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}
  function visible(el){
    if(!el||!(el instanceof Element))return false;
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;
    const r=el.getBoundingClientRect();return r.width>1&&r.height>1
  }
  function sourceOp(id){return (Array.isArray(window.opportunities)?window.opportunities:[]).find(o=>o?.sourceListing&&String(o.id)===String(id))||null}

  function installStyles(){
    if(document.getElementById('v082UiStabilityStyles'))return;
    const s=document.createElement('style');s.id='v082UiStabilityStyles';s.textContent=`
      [data-v082-radar-visual-hidden="1"]{display:none!important}
      #v082SourceDetailPanel .v082-origin-actions [data-v082-correct-data],
      #v082SourceDetailPanel .v082-origin-actions [data-v082-correct-location],
      #v082SourceDetailPanel .v082-origin-actions [data-v082-mark-unavailable]{display:inline-flex!important;align-items:center;justify-content:center;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      #v082SourceDetailPanel .v082-origin-actions [data-v082-mark-unavailable]{border-color:#e6c9cd!important;color:#9b2734!important;background:#fff8f8!important}
      @media(max-width:760px){
        #v082SourceDetailPanel .v082-origin-actions [data-v082-correct-data],
        #v082SourceDetailPanel .v082-origin-actions [data-v082-correct-location],
        #v082SourceDetailPanel .v082-origin-actions [data-v082-mark-unavailable]{width:100%!important;box-sizing:border-box!important}
      }
    `;document.head.appendChild(s)
  }

  function navCandidates(){
    return [...document.querySelectorAll('.nav-item,.menu-item,.sidebar a,.sidebar button,nav a,nav button,[data-view],[data-section],[role="menuitem"]')]
  }
  function consolidateRadar(){
    const items=navCandidates();
    const visual=items.filter(el=>text(el)==='Radar Visual');
    let visualActive=false;
    for(const el of visual){
      if(el.classList.contains('active')||el.getAttribute('aria-current')==='page')visualActive=true;
      el.dataset.v082RadarVisualHidden='1';el.setAttribute('aria-hidden','true');el.setAttribute('tabindex','-1')
    }
    const visibleVisualHeading=[...document.querySelectorAll('h1,h2,h3')].find(el=>visible(el)&&text(el)==='Radar Visual'&&!el.closest('#detailModal,#opportunityDetail,.detail-modal,.opportunity-detail,[role="dialog"],.modal,.drawer,.sheet'));
    if((visualActive||visibleVisualHeading)&&!redirecting){
      const radar=items.find(el=>text(el)==='Radar'&&el.dataset.v082RadarVisualHidden!=='1'&&visible(el));
      if(radar){redirecting=true;setTimeout(()=>{try{radar.click()}finally{setTimeout(()=>{redirecting=false},120)}},0)}
    }
  }

  function makeButton(kind,id){
    const b=document.createElement('button');b.type='button';b.className='v082-origin-btn';
    if(kind==='data'){b.setAttribute('data-v082-correct-data',String(id));b.textContent='✏️ Corrigir dados'}
    else if(kind==='location'){b.setAttribute('data-v082-correct-location',String(id));b.textContent='📍 Corrigir localização'}
    else{b.setAttribute('data-v082-mark-unavailable',String(id));b.classList.add('v082-admin-danger');b.textContent='Marcar indisponível'}
    return b
  }
  function ensureActionButtons(){
    const panel=document.getElementById('v082SourceDetailPanel');if(!panel)return false;
    const id=panel.dataset.v082OpId||panel.closest('[data-v082-opportunity-id]')?.dataset?.v082OpportunityId||'';
    const op=sourceOp(id);if(!op)return false;
    const actions=panel.querySelector('.v082-origin-actions');if(!actions)return false;
    const specs=[
      ['data','[data-v082-correct-data]'],
      ['location','[data-v082-correct-location]'],
      ['unavailable','[data-v082-mark-unavailable]']
    ];
    const buttons=[];
    for(const [kind,sel] of specs){
      let b=actions.querySelector(sel);if(!b){b=makeButton(kind,op.id);actions.appendChild(b)}
      const attr=kind==='data'?'data-v082-correct-data':kind==='location'?'data-v082-correct-location':'data-v082-mark-unavailable';
      if(b.getAttribute(attr)!==String(op.id))b.setAttribute(attr,String(op.id));
      buttons.push(b)
    }
    const adminNow=[...actions.querySelectorAll('[data-v082-correct-data],[data-v082-correct-location],[data-v082-mark-unavailable]')];
    if(adminNow.length!==3||adminNow.some((b,i)=>b!==buttons[i]))buttons.forEach(b=>actions.appendChild(b));
    panel.dataset.v082ActionsStable=BUILD;return true
  }

  function run(){queued=false;installStyles();consolidateRadar();ensureActionButtons()}
  function schedule(delay=0){
    if(delay){setTimeout(()=>schedule(0),delay);return}
    if(queued)return;queued=true;requestAnimationFrame(run)
  }

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'||m.type==='attributes'))schedule()
  });
  function startObserver(){if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-current']});else setTimeout(startObserver,50)}

  window.addEventListener('betel:detail-context',()=>{schedule();schedule(80);schedule(260);schedule(800)});
  window.addEventListener('betel:real-data-ready',()=>{schedule();schedule(180)});
  window.addEventListener('pageshow',()=>{schedule();schedule(350)});
  document.addEventListener('click',e=>{
    const t=e.target.closest?.('.nav-item,.menu-item,.sidebar a,.sidebar button,nav a,nav button,[data-view],[data-section],[onclick*="openDetail"]');
    if(t)schedule(80)
  },true);

  installStyles();startObserver();schedule();schedule(500);schedule(1200);
  window.__BETEL_UI_STABILITY__={build:BUILD,ensureActionButtons,consolidateRadar};
})();
