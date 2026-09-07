/* Betel Radar v0.8.2 — autoridade única para Dashboard/CRM, build 8226 */
(function(){
  const BUILD='8226';
  const STAGES=['Novo','Analisado','Interessante','Contato pendente','Contatado','Respondeu','Orçamento','Contratado'];
  let scheduled=false;
  let lastGood=[];

  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function visible(el){if(!el||!(el instanceof Element))return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;const r=el.getBoundingClientRect();return r.width>1&&r.height>1}
  function liveOps(){
    const now=(Array.isArray(window.opportunities)?window.opportunities:[]).filter(o=>o&&o.sourceListing);
    if(now.length)lastGood=[...now];
    return now.length?now:lastGood;
  }
  function stageOf(o){const s=norm(o?.status);return STAGES.includes(s)?s:'Novo'}
  function counts(list=liveOps()){const out=Object.fromEntries(STAGES.map(s=>[s,0]));for(const o of list)out[stageOf(o)]++;return out}
  function scoreOf(o){
    const n=Number(o?.score);if(Number.isFinite(n)&&n>0)return n;
    const area=Number(o?.areaM2??o?.area_m2)||0;
    const t=`${o?.type||o?.propertyType||o?.property_type||''} ${o?.title||''}`.toLowerCase();
    let s=68;if(area>=50000)s+=24;else if(area>=10000)s+=20;else if(area>=5000)s+=16;else if(area>=2000)s+=13;else if(area>=1000)s+=10;else if(area>=500)s+=7;else if(area>0)s+=3;
    s+=(t.includes('fazenda')||t.includes('sítio')||t.includes('sitio')||t.includes('chácara')||t.includes('chacara'))?8:5;
    return Math.max(60,Math.min(100,s));
  }

  function installStyles(){
    if(document.getElementById('v082DashboardCrmStyles'))return;
    const s=document.createElement('style');s.id='v082DashboardCrmStyles';s.textContent=`
      #v082CrmMobileList{display:grid;gap:12px;margin-top:14px}
      .v082-crm-card{width:100%;box-sizing:border-box;text-align:left;border:1px solid #e7e4df;border-radius:18px;background:#fff;padding:16px 18px;cursor:pointer;font:inherit;color:#171717}
      .v082-crm-card strong{display:block;font-size:15px;line-height:1.35;margin-bottom:5px}.v082-crm-card small{display:block;color:#777;font-size:12px;line-height:1.4}
      .v082-crm-empty{border:1px solid #e7e4df;border-radius:18px;background:#fff;padding:18px;color:#777;font-size:13px}
      [data-v082-native-crm-empty="1"]{display:none!important}
      @media(min-width:761px){#v082CrmMobileList{display:none!important}}
    `;document.head.appendChild(s)
  }

  function exactText(txt,scope=document){
    return [...scope.querySelectorAll('div,span,p,small,h1,h2,h3,h4,label')].find(el=>visible(el)&&norm(el.textContent)===txt)||null
  }
  function dashboardRoot(){
    const label=exactText('Novas oportunidades');if(!label)return null;
    let p=label.parentElement;
    for(let i=0;p&&p!==document.body&&i<9;i++,p=p.parentElement){
      const t=norm(p.textContent);
      if(t.includes('Novas oportunidades')&&t.includes('Alto potencial')&&t.includes('Contatos pendentes')&&t.includes('Negócios em andamento'))return p;
    }
    return label.parentElement?.parentElement||null;
  }
  function crmSelect(scope=document){
    return [...scope.querySelectorAll('select')].find(sel=>visible(sel)&&[...sel.options].map(o=>norm(o.textContent).replace(/\s*\(\d+\)\s*$/,'')).filter(v=>STAGES.includes(v)).length>=4)||null
  }
  function crmRoot(){
    const sel=crmSelect();if(!sel)return null;
    let p=sel.parentElement;
    for(let i=0;p&&p!==document.body&&i<8;i++,p=p.parentElement){const t=norm(p.textContent);if(t.includes('Etapa do funil')&&t.includes('CRM'))return p}
    return sel.parentElement?.parentElement||sel.parentElement;
  }

  function metricNode(labelEl){
    let p=labelEl?.parentElement;
    for(let depth=0;p&&depth<4;depth++,p=p.parentElement){
      const leaves=[...p.querySelectorAll('b,strong,[data-value],.value,.number,div,span,p')].filter(el=>el!==labelEl&&el.children.length===0&&/^[-—]?\s*\d+(?:[.,]\d+)?\s*$/.test(norm(el.textContent)));
      if(leaves.length)return leaves.sort((a,b)=>parseFloat(getComputedStyle(b).fontSize||0)-parseFloat(getComputedStyle(a).fontSize||0))[0];
    }
    return null
  }
  function setMetric(root,label,value){
    const el=exactText(label,root);if(!el)return false;const n=metricNode(el);if(!n)return false;
    const v=String(value);if(norm(n.textContent)!==v)n.textContent=v;return true
  }
  function patchFunnel(root,c){
    const rows=[...root.querySelectorAll('div,li,tr')];
    for(const stage of STAGES){
      const row=rows.find(el=>{const t=norm(el.textContent);return t===stage||t.startsWith(stage+' ')||t.startsWith(stage+'(')});if(!row)continue;
      const vals=[...row.querySelectorAll('b,strong,span')].filter(el=>/^\d+$/.test(norm(el.textContent)));const target=vals.at(-1);if(target&&norm(target.textContent)!==String(c[stage]||0))target.textContent=String(c[stage]||0)
    }
  }
  function patchDashboard(){
    const root=dashboardRoot(),list=liveOps();if(!root||!list.length)return false;const c=counts(list);
    setMetric(root,'Novas oportunidades',c.Novo);
    setMetric(root,'Alto potencial',list.filter(o=>scoreOf(o)>=80).length);
    setMetric(root,'Contatos pendentes',c['Contato pendente']);
    setMetric(root,'Negócios em andamento',c.Contatado+c.Respondeu+c['Orçamento']);
    setMetric(root,'Follow-ups atrasados',list.filter(o=>o.followUp&&new Date(o.followUp)<new Date()).length);
    patchFunnel(root,c);root.dataset.v082DashboardBuild=BUILD;return true
  }

  function selectedStage(sel){
    if(!sel)return 'Novo';const value=norm(sel.value);if(STAGES.includes(value))return value;
    const txt=norm(sel.options[sel.selectedIndex]?.textContent).replace(/\s*\(\d+\)\s*$/,'');return STAGES.includes(txt)?txt:'Novo'
  }
  function updateStageOptions(sel,c){
    if(!sel)return;for(const opt of sel.options){const base=norm(opt.textContent).replace(/\s*\(\d+\)\s*$/,'');if(STAGES.includes(base)){const txt=`${base} (${c[base]||0})`;if(opt.textContent!==txt)opt.textContent=txt}}
  }
  function hideNativeEmpty(root){[...root.querySelectorAll('div,p,span')].forEach(el=>{if(norm(el.textContent)==='Nenhuma oportunidade nesta etapa.')el.dataset.v082NativeCrmEmpty='1'})}
  function renderMobileCrm(root,sel,list,c){
    if(window.innerWidth>760||!sel)return;updateStageOptions(sel,c);hideNativeEmpty(root);
    let box=root.querySelector('#v082CrmMobileList');if(!box){box=document.createElement('div');box.id='v082CrmMobileList';const holder=sel.closest('.field,.filter,.form-group,.crm-filter')||sel.parentElement;holder.insertAdjacentElement('afterend',box)}
    const stage=selectedStage(sel),rows=list.filter(o=>stageOf(o)===stage);box.dataset.stage=stage;
    const sig=rows.map(o=>`${o.id}:${o.status}:${o.score}`).join('|');if(box.dataset.sig===sig)return;box.dataset.sig=sig;
    box.innerHTML=rows.length?rows.map(o=>`<button type="button" class="v082-crm-card" data-v082-crm-op="${esc(o.id)}"><strong>${esc(o.title)}</strong><small>${esc(o.city||'Local não informado')} · Score ${scoreOf(o)}</small></button>`).join(''):'<div class="v082-crm-empty">Nenhuma oportunidade nesta etapa.</div>'
  }
  function renderDesktopKanban(root,list,c){
    if(window.innerWidth<=760)return;const kanban=root.querySelector('#kanban');if(!kanban)return;
    const sig=list.map(o=>`${o.id}:${stageOf(o)}:${scoreOf(o)}`).join('|');if(kanban.dataset.v082Sig===sig)return;kanban.dataset.v082Sig=sig;
    kanban.innerHTML=STAGES.map(stage=>{const rows=list.filter(o=>stageOf(o)===stage);return `<div class="kanban-col" data-stage="${esc(stage)}"><h3>${esc(stage)} (${c[stage]||0})</h3>${rows.map(o=>`<div class="kanban-card" data-v082-crm-op="${esc(o.id)}"><strong>${esc(o.title)}</strong><small>${esc(o.city||'')} · Score ${scoreOf(o)}</small></div>`).join('')||'<div class="empty-col">Nenhuma oportunidade nesta etapa.</div>'}</div>`}).join('')
  }
  function patchCrm(){
    const root=crmRoot(),list=liveOps();if(!root||!list.length)return false;const c=counts(list),sel=crmSelect(root)||crmSelect();
    updateStageOptions(sel,c);renderMobileCrm(root,sel,list,c);renderDesktopKanban(root,list,c);root.dataset.v082CrmBuild=BUILD;return true
  }

  function currentDetailRoot(el){return el?.closest('[role="dialog"],.modal,.drawer,.sheet,.detail-modal,.opportunity-detail')||null}
  function syncDetailStatus(e){
    const sel=e.target;if(!(sel instanceof HTMLSelectElement))return;const dialog=currentDetailRoot(sel);if(!dialog||!norm(dialog.textContent).includes('FICHA DA OPORTUNIDADE'))return;
    const stage=selectedStage(sel);if(!STAGES.includes(stage))return;const panel=dialog.querySelector('#v082SourceDetailPanel')||document.getElementById('v082SourceDetailPanel');const id=panel?.dataset?.v082OpId||'';
    let op=liveOps().find(o=>String(o.id)===String(id));if(!op){const title=[...dialog.querySelectorAll('h1,h2,h3')].map(x=>norm(x.textContent)).find(t=>t&&t!=='Histórico'&&t!=='Mensagens registradas'&&t!=='Origem e verificação');op=liveOps().find(o=>norm(o.title)===title)}
    if(!op)return;op.status=stage;lastGood=[...liveOps()];schedule(20);schedule(100)
  }

  function run(){scheduled=false;installStyles();patchDashboard();patchCrm()}
  function schedule(delay=0){if(delay){setTimeout(()=>schedule(0),delay);return}if(scheduled)return;scheduled=true;requestAnimationFrame(run)}

  const observer=new MutationObserver(()=>{schedule();schedule(40)});
  function observe(){if(document.body)observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style','value']});else setTimeout(observe,50)}

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('[data-v082-crm-op]');if(card){const id=card.getAttribute('data-v082-crm-op');if(typeof window.openDetail==='function')window.openDetail(Number.isFinite(Number(id))?Number(id):id)}
    if(e.target.closest?.('.nav-item,.bottom-nav,.mobile-bottom-nav,[data-view],[data-section],[onclick*="showSection"],[onclick*="navigate"]')){schedule();schedule(40);schedule(120);schedule(320)}
  },true);
  document.addEventListener('change',e=>{if(e.target instanceof HTMLSelectElement){syncDetailStatus(e);schedule();schedule(60)}} ,true);
  window.addEventListener('betel:real-data-ready',()=>{lastGood=[];schedule();schedule(40);schedule(120);schedule(400)});
  window.addEventListener('betel:opportunities-synced',()=>{schedule();schedule(60);schedule(220)});
  window.addEventListener('pageshow',()=>{schedule();schedule(80);schedule(300)});
  window.addEventListener('focus',()=>{schedule();schedule(80)});
  window.addEventListener('resize',()=>schedule(80),{passive:true});
  setInterval(()=>{if(!document.hidden&&(dashboardRoot()||crmSelect()))schedule()},350);
  installStyles();observe();schedule();schedule(120);schedule(500);
  window.__BETEL_DASHBOARD_CRM_AUTHORITY__={build:BUILD,refresh:()=>schedule(),counts:()=>counts(liveOps()),get count(){return liveOps().length}};
})();
