/* Betel Radar v0.8.2 — fluxo interno determinístico da ficha, build 8220 */
(function(){
  const BUILD='8220';
  let observerTimer=null;
  let closing=false;

  function norm(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function rendered(el){
    if(!el||!(el instanceof Element))return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')return false;
    return el.getClientRects().length>0;
  }
  function visible(el){
    if(!rendered(el))return false;
    const r=el.getBoundingClientRect();
    return r.width>20&&r.height>16&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;
  }
  function closeSelector(){return '[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]'}

  function neutralizeLegacyHostCss(){
    const style=document.getElementById('v082OpportunityDetailStyles');
    if(!style)return false;
    const bad='.v082-detail-host{display:block!important;grid-template-columns:minmax(0,1fr)!important;flex-direction:column!important;align-items:stretch!important;overflow-x:hidden!important;max-width:100vw!important;width:100%!important;box-sizing:border-box!important}';
    const badChildren='.v082-detail-host>*{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}';
    if(style.textContent.includes(bad))style.textContent=style.textContent.replace(bad,'.v082-detail-host{min-width:0!important;overflow-x:hidden!important}');
    if(style.textContent.includes(badChildren))style.textContent=style.textContent.replace(badChildren,'.v082-detail-host>*{min-width:0!important;box-sizing:border-box!important}');
    return true;
  }

  function installStyles(){
    document.getElementById('v082DetailFlowStyles')?.remove();
    const s=document.createElement('style');
    s.id='v082DetailFlowStyles';
    s.textContent=`
      #v082SourceDetailPanel:not(.v082-flow-placed),#v082ProspectingPanel:not(.v082-flow-placed){display:none!important}
      .v082-detail-flow-content{min-width:0!important;box-sizing:border-box!important}
      .v082-detail-flow-content>#v082SourceDetailPanel.v082-flow-placed,
      .v082-detail-flow-content>#v082ProspectingPanel.v082-flow-placed{
        display:block!important;position:relative!important;float:none!important;clear:both!important;
        inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
        transform:none!important;z-index:auto!important;box-sizing:border-box!important;max-width:100%!important;
      }
      .v082-detail-flow-content.v082-flow-padded>#v082SourceDetailPanel.v082-flow-placed,
      .v082-detail-flow-content.v082-flow-padded>#v082ProspectingPanel.v082-flow-placed{
        width:100%!important;margin-left:0!important;margin-right:0!important;
      }
      .v082-detail-flow-content:not(.v082-flow-padded)>#v082SourceDetailPanel.v082-flow-placed,
      .v082-detail-flow-content:not(.v082-flow-padded)>#v082ProspectingPanel.v082-flow-placed{
        width:calc(100% - 32px)!important;margin-left:16px!important;margin-right:16px!important;
      }
      .v082-detail-flow-content>#v082SourceDetailPanel.v082-flow-placed{margin-top:22px!important;margin-bottom:12px!important}
      .v082-detail-flow-content>#v082ProspectingPanel.v082-flow-placed{margin-top:0!important;margin-bottom:28px!important}
      @media(max-width:760px){
        .v082-detail-flow-content>#v082SourceDetailPanel.v082-flow-placed,
        .v082-detail-flow-content>#v082ProspectingPanel.v082-flow-placed{min-width:0!important}
      }
    `;
    document.head.appendChild(s);
  }

  function nodesMatching(regex){
    return [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p,small,strong,b')]
      .filter(el=>rendered(el)&&regex.test(norm(el.textContent)));
  }
  function lca(a,b){
    if(!a||!b)return null;
    let el=a;
    while(el&&el!==document.body){if(el.contains(b))return el;el=el.parentElement}
    return null;
  }
  function directChild(root,node){
    if(!root||!node||!root.contains(node))return null;
    let el=node;
    while(el.parentElement&&el.parentElement!==root)el=el.parentElement;
    return el.parentElement===root?el:null;
  }
  function rootScore(root,label,history){
    if(!root||root===document.body||!rendered(root))return -Infinity;
    const r=root.getBoundingClientRect();
    if(r.width<Math.min(280,innerWidth*.65)||r.height<240)return -Infinity;
    let score=0;
    if(root.contains(label)&&root.contains(history))score+=100;
    if(root.querySelector(closeSelector()))score+=36;
    if(/ficha da oportunidade/i.test(norm(root.textContent)))score+=18;
    if(/mensagens registradas/i.test(norm(root.textContent)))score+=18;
    if(/histórico/i.test(norm(root.textContent)))score+=18;
    const cs=getComputedStyle(root);
    const radius=Math.max(parseFloat(cs.borderTopLeftRadius)||0,parseFloat(cs.borderTopRightRadius)||0);
    if(radius>=12)score+=24;
    if(/overlay|backdrop/i.test(`${root.id||''} ${root.className||''}`))score-=70;
    if(r.width<=innerWidth*1.05)score+=12;
    return score;
  }
  function findFlowContext(){
    const labels=nodesMatching(/^ficha da oportunidade$/i);
    const histories=nodesMatching(/^histórico$/i);
    let best=null,bestScore=-Infinity;
    for(const label of labels){
      for(const history of histories){
        let start=lca(label,history);
        if(!start)continue;
        let cur=start;
        for(let i=0;i<6&&cur&&cur!==document.body;i++,cur=cur.parentElement){
          const score=rootScore(cur,label,history);
          if(score>bestScore){best={root:cur,label,history};bestScore=score}
        }
      }
    }
    return best;
  }
  function historyAnchor(root,history){
    let anchor=directChild(root,history)||history;
    const next=anchor.nextElementSibling;
    if(next&&!next.matches?.('#v082SourceDetailPanel,#v082ProspectingPanel')){
      const t=norm(next.textContent);
      if(/sem atividades registradas|nenhuma atividade registrada|sem atividades/i.test(t))anchor=next;
    }
    return anchor;
  }
  function choosePanel(id,opId,root){
    const all=[...document.querySelectorAll(`[id="${id}"]`)];
    if(!all.length)return null;
    const chosen=all.find(p=>opId!==null&&String(p.dataset?.v082OpId||'')===String(opId))||all.find(p=>root?.contains(p))||all[all.length-1];
    all.forEach(p=>{if(p!==chosen)p.remove()});
    return chosen;
  }
  function currentOpId(root){
    const stored=root?.dataset?.v082OpportunityId;
    if(stored!==undefined&&stored!==null&&stored!=='')return stored;
    const origin=document.getElementById('v082SourceDetailPanel');
    if(origin?.dataset?.v082OpId)return origin.dataset.v082OpId;
    if(!Array.isArray(window.opportunities))return null;
    const text=norm(root?.textContent);
    const matches=window.opportunities.filter(o=>norm(o?.title)&&text.includes(norm(o.title))).sort((a,b)=>norm(b.title).length-norm(a.title).length);
    return matches[0]?.id??null;
  }
  function applyPaddingClass(root){
    const cs=getComputedStyle(root);
    const pl=parseFloat(cs.paddingLeft)||0,pr=parseFloat(cs.paddingRight)||0;
    root.classList.toggle('v082-flow-padded',pl>=14||pr>=14);
  }

  function repair(){
    neutralizeLegacyHostCss();installStyles();
    const ctx=findFlowContext();
    if(!ctx)return false;
    const {root,history}=ctx;
    const opId=currentOpId(root);
    const origin=choosePanel('v082SourceDetailPanel',opId,root);
    const prospect=choosePanel('v082ProspectingPanel',opId,root);
    if(!origin&&!prospect)return false;

    document.querySelectorAll('.v082-detail-flow-content').forEach(el=>{if(el!==root)el.classList.remove('v082-detail-flow-content','v082-flow-padded')});
    root.classList.add('v082-detail-flow-content');
    applyPaddingClass(root);
    if(opId!==null)root.dataset.v082OpportunityId=String(opId);

    let anchor=historyAnchor(root,history);
    if(origin){
      origin.classList.add('v082-flow-placed');
      if(origin.parentElement!==root||origin.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',origin);
      anchor=origin;
    }
    if(prospect){
      prospect.classList.add('v082-flow-placed');
      if(prospect.parentElement!==root||prospect.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',prospect);
    }
    return true;
  }

  function schedule(){[0,40,120,260,520,900,1400].forEach(ms=>setTimeout(repair,ms))}
  function cleanup(removePanels=false){
    document.querySelectorAll('.v082-detail-flow-content').forEach(el=>el.classList.remove('v082-detail-flow-content','v082-flow-padded'));
    document.querySelectorAll('#v082SourceDetailPanel,#v082ProspectingPanel').forEach(el=>{
      el.classList.remove('v082-flow-placed');
      if(removePanels)el.remove();
    });
  }
  function findCloseContext(btn){
    if(!btn)return null;
    const ctx=findFlowContext();
    if(!ctx)return null;
    if(ctx.root.contains(btn))return ctx.root;
    const br=btn.getBoundingClientRect(),rr=ctx.root.getBoundingClientRect();
    if(br.right>=rr.right-120&&br.left<=rr.right+20&&br.top>=rr.top-24&&br.top<=rr.top+160)return ctx.root;
    return null;
  }
  function ensureClosed(root){
    setTimeout(()=>{
      if(!root?.isConnected||!visible(root)){cleanup(true);return}
      neutralizeLegacyHostCss();
      if(typeof window.closeDetail==='function'&&!closing){
        closing=true;
        try{window.closeDetail()}catch{}
        setTimeout(()=>{closing=false;cleanup(true)},160);
      }
    },100);
  }

  window.addEventListener('betel:detail-context',schedule);
  window.addEventListener('betel:real-data-ready',()=>setTimeout(repair,180));
  window.addEventListener('pageshow',()=>{neutralizeLegacyHostCss();setTimeout(repair,420)});
  document.addEventListener('click',e=>{
    const open=e.target.closest?.('[onclick*="openDetail"],.opportunity-card,.radar-card,.visual-card,.kanban-card,.map-popup button');
    if(open){schedule();return}
    const close=e.target.closest?.(closeSelector());
    if(close){const root=findCloseContext(close);if(root){setTimeout(()=>cleanup(false),40);ensureClosed(root)}}
  },true);

  const observer=new MutationObserver(()=>{
    if(observerTimer)return;
    observerTimer=setTimeout(()=>{
      observerTimer=null;
      if(document.getElementById('v082SourceDetailPanel')||document.getElementById('v082ProspectingPanel'))repair();
    },90);
  });
  const startObserver=()=>observer.observe(document.body,{childList:true,subtree:true});
  if(document.body)startObserver();else window.addEventListener('DOMContentLoaded',startObserver,{once:true});

  neutralizeLegacyHostCss();installStyles();
  setTimeout(neutralizeLegacyHostCss,300);
  window.__BETEL_DETAIL_LAYOUT_FIX__={build:BUILD,repair,findFlowContext,neutralizeLegacyHostCss};
})();
