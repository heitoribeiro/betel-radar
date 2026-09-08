/* Betel Radar v0.8.2 — sincronização robusta Funil/CRM + integração do botão Hoje, build 8240 */
(function(){
  'use strict';

  const BUILD='8240';
  const STAGES=['Novo','Analisado','Interessante','Contato pendente','Contatado','Respondeu','Orçamento','Contratado'];
  let scheduled=false;
  let lastGood=[];

  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function allOps(){
    const list=Array.isArray(window.opportunities)?window.opportunities.filter(Boolean):[];
    const real=list.filter(o=>o.sourceListing);
    const current=real.length?real:list;
    if(current.length)lastGood=[...current];
    return current.length?current:lastGood;
  }

  function stageOf(o){
    const raw=norm(o?.status);
    if(STAGES.includes(raw))return raw;
    if(!raw||raw==='Descoberto'||raw==='Disponível'||raw==='Ativo')return 'Novo';
    return 'Novo';
  }

  function counts(list=allOps()){
    const out=Object.fromEntries(STAGES.map(s=>[s,0]));
    for(const o of list)out[stageOf(o)]++;
    return out;
  }

  function installStyles(){
    if(document.getElementById('v082FunnelCrmSyncStyles'))return;
    const s=document.createElement('style');
    s.id='v082FunnelCrmSyncStyles';
    s.textContent=`
      #agendaProductivity .v082-agenda-today{background:#fff!important;color:#171717!important;border:1px solid #dedad4!important;box-shadow:none!important;width:auto!important;margin:0!important}
      #agendaProductivity .v081-actions{display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:wrap!important}
      body.betel-compact-desktop #agendaProductivity .v081-actions{justify-content:flex-start!important}
      @media(max-width:760px){#agendaProductivity .v081-actions{display:grid!important;grid-template-columns:1fr 1fr!important}.v082-agenda-today,#exportAgendaCsv{width:100%!important}}
    `;
    document.head.appendChild(s);
  }

  function renderFunnel(){
    const root=document.getElementById('funnel');
    const list=allOps();
    if(!root||!list.length)return false;
    const c=counts(list);
    const sig=STAGES.map(s=>`${s}:${c[s]}`).join('|');
    if(root.dataset.v082FunnelSig===sig&&root.children.length===STAGES.length)return true;
    root.dataset.v082FunnelSig=sig;
    root.innerHTML=STAGES.map(stage=>`<div class="funnel-row"><span>${esc(stage)}</span><b>${c[stage]||0}</b></div>`).join('');
    return true;
  }

  function scoreOf(o){
    const n=Number(o?.score);
    if(Number.isFinite(n)&&n>0)return n;
    return '';
  }

  function makeKanbanCard(o){
    const card=document.createElement('div');
    card.className='kanban-card';
    card.draggable=true;
    card.dataset.v082CrmOp=String(o.id??'');
    card.innerHTML=`<strong>${esc(o.title||'Oportunidade')}</strong><small>${esc(o.city||'Local não informado')}${scoreOf(o)!==''?' · Score '+esc(scoreOf(o)):''}</small>${o.followUp?`<span class="followup-badge">📅 ${esc(typeof window.formatFollowUp==='function'?window.formatFollowUp(o.followUp):o.followUp)}</span>`:''}`;
    card.addEventListener('dragstart',event=>event.dataTransfer?.setData('text/plain',String(o.id??'')));
    card.addEventListener('click',()=>{
      if(typeof window.openDetail==='function')window.openDetail(Number.isFinite(Number(o.id))?Number(o.id):o.id);
    });
    return card;
  }

  function renderKanban(){
    const root=document.getElementById('kanban');
    const list=allOps();
    if(!root||!list.length)return false;
    const c=counts(list);
    const sig=list.map(o=>`${o.id}:${stageOf(o)}:${o.score??''}:${o.followUp??''}`).join('|');
    if(root.dataset.v082AuthoritativeSig===sig&&root.children.length===STAGES.length)return true;
    root.dataset.v082AuthoritativeSig=sig;
    root.innerHTML='';

    for(const stage of STAGES){
      const col=document.createElement('div');
      col.className='kanban-col';
      col.dataset.stage=stage;
      const h=document.createElement('h3');
      h.textContent=`${stage} (${c[stage]||0})`;
      col.appendChild(h);
      const rows=list.filter(o=>stageOf(o)===stage);
      if(rows.length)rows.forEach(o=>col.appendChild(makeKanbanCard(o)));
      else{
        const empty=document.createElement('div');
        empty.className='empty-col';
        empty.textContent='Nenhuma oportunidade nesta etapa.';
        col.appendChild(empty);
      }
      col.addEventListener('dragover',event=>{event.preventDefault();col.classList.add('drag-over')});
      col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
      col.addEventListener('drop',event=>{
        event.preventDefault();
        col.classList.remove('drag-over');
        const id=event.dataTransfer?.getData('text/plain');
        if(typeof window.dropCrm==='function'){
          try{window.dropCrm(event,stage)}catch{}
        }else{
          const op=allOps().find(x=>String(x.id)===String(id));
          if(op)op.status=stage;
        }
        schedule(40);schedule(140);
      });
      root.appendChild(col);
    }
    return true;
  }

  function updateMobileStageSelect(){
    const list=allOps();
    if(!list.length)return;
    const c=counts(list);
    const selects=[...document.querySelectorAll('select')];
    for(const sel of selects){
      const bases=[...sel.options].map(o=>norm(o.textContent).replace(/\s*\(\d+\)\s*$/,''));
      if(bases.filter(v=>STAGES.includes(v)).length<4)continue;
      for(const opt of sel.options){
        const base=norm(opt.textContent).replace(/\s*\(\d+\)\s*$/,'');
        if(STAGES.includes(base))opt.textContent=`${base} (${c[base]||0})`;
      }
    }
  }

  function integrateAgendaToday(){
    const box=document.getElementById('agendaProductivity');
    if(!box)return false;
    const actions=box.querySelector('.v081-actions');
    if(!actions)return false;
    let today=box.querySelector('.v082-agenda-today');
    if(!today){
      today=[...document.querySelectorAll('button')].find(btn=>btn!==box&& !box.contains(btn) && norm(btn.textContent)==='Hoje' && btn.offsetParent!==null);
      if(!today)return false;
      today.classList.add('v081-export','v081-secondary','v082-agenda-today');
      actions.appendChild(today);
    }else if(today.parentElement!==actions){
      actions.appendChild(today);
    }
    return true;
  }

  function run(){
    scheduled=false;
    installStyles();
    renderFunnel();
    renderKanban();
    updateMobileStageSelect();
    integrateAgendaToday();
    document.body?.setAttribute('data-betel-funnel-crm-sync',BUILD);
  }

  function schedule(delay=0){
    if(delay){setTimeout(()=>schedule(),delay);return}
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(run);
  }

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'||m.type==='characterData'||(m.type==='attributes'&&(m.attributeName==='class'||m.attributeName==='style'))))schedule(30);
  });

  function start(){
    if(!document.body){setTimeout(start,40);return}
    installStyles();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style']});
    schedule();schedule(120);schedule(500);schedule(1200);
  }

  document.addEventListener('click',event=>{
    if(event.target.closest?.('.nav-item,[data-view],[data-section],[onclick*="showSection"],[onclick*="navigate"]')){schedule(20);schedule(120);schedule(350)}
  },true);
  document.addEventListener('change',()=>{schedule(30);schedule(140)},true);
  window.addEventListener('betel:real-data-ready',()=>{lastGood=[];schedule();schedule(80);schedule(260)});
  window.addEventListener('betel:opportunities-synced',()=>{schedule();schedule(100);schedule(320)});
  window.addEventListener('pageshow',()=>{schedule();schedule(120)});
  window.addEventListener('focus',()=>schedule(80));

  start();
  window.__BETEL_FUNNEL_CRM_SYNC__={build:BUILD,refresh:()=>schedule(),counts:()=>counts(allOps())};
})();
