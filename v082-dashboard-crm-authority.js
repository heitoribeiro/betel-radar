/* Betel Radar v0.8.2 — autoridade única para Dashboard/CRM, build 8225 */
(function(){
  const BUILD='8225';
  const STAGES=['Novo','Analisado','Interessante','Contato pendente','Contatado','Respondeu','Orçamento','Contratado'];
  let scheduled=false;

  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function visible(el){if(!el||!(el instanceof Element))return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;const r=el.getBoundingClientRect();return r.width>1&&r.height>1}
  function ops(){return (Array.isArray(window.opportunities)?window.opportunities:[]).filter(o=>o&&o.sourceListing)}
  function stageOf(o){const s=norm(o?.status);return STAGES.includes(s)?s:'Novo'}
  function counts(list=ops()){const out=Object.fromEntries(STAGES.map(s=>[s,0]));for(const o of list)out[stageOf(o)]++;return out}

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

  function heading(text){return [...document.querySelectorAll('h1,h2,h3')].find(el=>visible(el)&&norm(el.textContent)===text)}
  function viewRoot(h){return h?.closest('.view,.content-view,.page,.panel,[data-view],[data-section]')||h?.parentElement?.parentElement||document.body}

  function metricNode(labelEl){
    let p=labelEl?.parentElement;
    for(let depth=0;p&&depth<5;depth++,p=p.parentElement){
      const strong=p.querySelector('b,strong,[data-value],.value,.number');
      if(strong&&strong!==labelEl&&/^[-—]?\s*\d+(?:[.,]\d+)?\s*$/.test(norm(strong.textContent)))return strong;
      const direct=[...p.children].find(el=>el!==labelEl&&/^\d+$/.test(norm(el.textContent)));
      if(direct)return direct;
      const num=[...p.querySelectorAll('div,span,p')].find(el=>el!==labelEl&&el.children.length===0&&/^\d+$/.test(norm(el.textContent)));
      if(num)return num;
    }
    return null
  }
  function setMetric(root,label,value){
    const el=[...root.querySelectorAll('div,span,p,small,h3,h4')].find(x=>norm(x.textContent)===label);
    if(!el)return false;const n=metricNode(el);if(!n)return false;if(norm(n.textContent)!==String(value))n.textContent=String(value);return true
  }
  function patchFunnel(root,c){
    const rows=[...root.querySelectorAll('div,li,tr')];
    for(const stage of STAGES){
      const row=rows.find(el=>{const t=norm(el.textContent);return t.startsWith(stage+' ')||t===stage||t.startsWith(stage+'0')||t.startsWith(stage+'1')});
      if(!row)continue;
      const values=[...row.querySelectorAll('b,strong,span')].filter(el=>/^\d+$/.test(norm(el.textContent)));
      const target=values.at(-1);if(target)target.textContent=String(c[stage]||0)
    }
  }
  function patchDashboard(){
    const h=heading('Dashboard');if(!h)return false;const root=viewRoot(h),list=ops();if(!list.length)return false;const c=counts(list);
    setMetric(root,'Novas oportunidades',c.Novo);
    setMetric(root,'Alto potencial',list.filter(o=>Number(o.score)>=80).length);
    setMetric(root,'Contatos pendentes',c['Contato pendente']);
    setMetric(root,'Negócios em andamento',c.Contatado+c.Respondeu+c['Orçamento']);
    setMetric(root,'Follow-ups atrasados',list.filter(o=>o.followUp&&new Date(o.followUp)<new Date()).length);
    patchFunnel(root,c);
    root.dataset.v082DashboardBuild=BUILD;return true
  }

  function crmSelect(root){
    return [...root.querySelectorAll('select')].find(sel=>{
      const txt=[...sel.options].map(o=>norm(o.textContent).replace(/\s*\(\d+\)\s*$/,'')).filter(Boolean);
      return txt.filter(v=>STAGES.includes(v)).length>=4
    })||null
  }
  function selectedStage(sel){
    if(!sel)return 'Novo';const byValue=norm(sel.value);if(STAGES.includes(byValue))return byValue;
    const txt=norm(sel.options[sel.selectedIndex]?.textContent).replace(/\s*\(\d+\)\s*$/,'');return STAGES.includes(txt)?txt:'Novo'
  }
  function updateStageOptions(sel,c){
    if(!sel)return;for(const opt of sel.options){const base=norm(opt.textContent).replace(/\s*\(\d+\)\s*$/,'');if(STAGES.includes(base))opt.textContent=`${base} (${c[base]||0})`}
  }
  function hideNativeEmpty(root){
    [...root.querySelectorAll('div,p,span')].forEach(el=>{if(norm(el.textContent)==='Nenhuma oportunidade nesta etapa.')el.dataset.v082NativeCrmEmpty='1'})
  }
  function renderMobileCrm(root,sel,list,c){
    if(window.innerWidth>760||!sel)return;
    updateStageOptions(sel,c);hideNativeEmpty(root);
    let box=root.querySelector('#v082CrmMobileList');if(!box){box=document.createElement('div');box.id='v082CrmMobileList';const holder=sel.closest('.field,.filter,.form-group,.crm-filter')||sel.parentElement;holder.insertAdjacentElement('afterend',box)}
    const stage=selectedStage(sel),rows=list.filter(o=>stageOf(o)===stage);
    box.dataset.stage=stage;
    if(!rows.length){box.innerHTML='<div class="v082-crm-empty">Nenhuma oportunidade nesta etapa.</div>';return}
    box.innerHTML=rows.map(o=>`<button type="button" class="v082-crm-card" data-v082-crm-op="${esc(o.id)}"><strong>${esc(o.title)}</strong><small>${esc(o.city||'Local não informado')} · Score ${Number(o.score)||0}</small></button>`).join('')
  }
  function renderDesktopKanban(root,list,c){
    if(window.innerWidth<=760)return;const kanban=root.querySelector('#kanban');if(!kanban)return;
    kanban.innerHTML=STAGES.map(stage=>{const rows=list.filter(o=>stageOf(o)===stage);return `<div class="kanban-col" data-stage="${esc(stage)}"><h3>${esc(stage)} (${c[stage]||0})</h3>${rows.map(o=>`<div class="kanban-card" data-v082-crm-op="${esc(o.id)}"><strong>${esc(o.title)}</strong><small>${esc(o.city||'')} · Score ${Number(o.score)||0}</small></div>`).join('')||'<div class="empty-col">Nenhuma oportunidade nesta etapa.</div>'}</div>`}).join('')
  }
  function patchCrm(){
    const h=heading('CRM');if(!h)return false;const root=viewRoot(h),list=ops();if(!list.length)return false;const c=counts(list),sel=crmSelect(root);
    updateStageOptions(sel,c);renderMobileCrm(root,sel,list,c);renderDesktopKanban(root,list,c);
    root.dataset.v082CrmBuild=BUILD;return true
  }

  function currentDetailRoot(el){return el?.closest('[role="dialog"],.modal,.drawer,.sheet,.detail-modal,.opportunity-detail')||null}
  function syncDetailStatus(e){
    const sel=e.target;if(!(sel instanceof HTMLSelectElement))return;const dialog=currentDetailRoot(sel);if(!dialog||!norm(dialog.textContent).includes('FICHA DA OPORTUNIDADE'))return;
    const stage=selectedStage(sel);if(!STAGES.includes(stage))return;
    const panel=dialog.querySelector('#v082SourceDetailPanel')||document.getElementById('v082SourceDetailPanel');let id=panel?.dataset?.v082OpId||'';
    let op=ops().find(o=>String(o.id)===String(id));
    if(!op){const title=[...dialog.querySelectorAll('h1,h2,h3')].map(x=>norm(x.textContent)).find(t=>t&&t!=='Histórico'&&t!=='Mensagens registradas'&&t!=='Origem e verificação');op=ops().find(o=>norm(o.title)===title)}
    if(!op)return;op.status=stage;
    try{window.__BETEL_REAL_DATA_AUTHORITY__?.enforce?.()}catch{}
    schedule(40);schedule(180)
  }

  function run(){scheduled=false;installStyles();patchDashboard();patchCrm()}
  function schedule(delay=0){if(delay){setTimeout(()=>schedule(0),delay);return}if(scheduled)return;scheduled=true;requestAnimationFrame(run)}

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('[data-v082-crm-op]');if(card){const id=card.getAttribute('data-v082-crm-op');if(typeof window.openDetail==='function')window.openDetail(Number.isFinite(Number(id))?Number(id):id)}
    if(e.target.closest?.('.nav-item,.bottom-nav,.mobile-bottom-nav,[data-view],[data-section],[onclick*="showSection"],[onclick*="navigate"]')){schedule(60);schedule(220)}
  },true);
  document.addEventListener('change',e=>{if(e.target instanceof HTMLSelectElement){syncDetailStatus(e);schedule(30);schedule(160)}} ,true);
  window.addEventListener('betel:real-data-ready',()=>{schedule();schedule(160);schedule(500)});
  window.addEventListener('betel:opportunities-synced',()=>{schedule(80);schedule(320)});
  window.addEventListener('pageshow',()=>{schedule();schedule(300)});
  window.addEventListener('resize',()=>schedule(120),{passive:true});
  setInterval(()=>{if(!document.hidden&&(heading('Dashboard')||heading('CRM')))schedule()},1200);
  installStyles();schedule(350);schedule(1000);
  window.__BETEL_DASHBOARD_CRM_AUTHORITY__={build:BUILD,refresh:()=>schedule(),counts:()=>counts(ops())};
})();
