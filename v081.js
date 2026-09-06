/* Betel Radar v0.8.1 — produtividade */
(function(){
  const VERSION='v0.8.1';
  const safeOps=()=>typeof opportunities!=='undefined'&&Array.isArray(opportunities)?opportunities:[];
  const csvCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  function downloadCsv(name,rows){const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  function updateVersion(){const chip=document.getElementById('versionChip');if(chip)chip.textContent='Betel Radar '+VERSION;const help=document.querySelector('#configView .auth-help');if(help&&!chip){const el=document.createElement('span');el.id='versionChip';el.className='version-chip';el.textContent='Betel Radar '+VERSION;help.insertAdjacentElement('afterend',el)}}
  function dateStart(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
  function validDate(v){const d=new Date(v);return Number.isFinite(d.getTime())?d:null}
  function patchAgenda(){
    const root=document.getElementById('agendaView');if(!root||document.getElementById('agendaProductivity'))return;
    const ops=safeOps().filter(o=>o.followUp&&validDate(o.followUp));
    const today=dateStart(new Date()),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);const end7=new Date(today);end7.setDate(end7.getDate()+8);
    const todayN=ops.filter(o=>{const d=validDate(o.followUp);return d>=today&&d<tomorrow}).length;
    const overdue=ops.filter(o=>validDate(o.followUp)<today).length;
    const next7=ops.filter(o=>{const d=validDate(o.followUp);return d>=tomorrow&&d<end7}).length;
    const box=document.createElement('div');box.id='agendaProductivity';box.className='v081-toolbar';box.innerHTML=`<div class="v081-summary"><div class="v081-metric"><small>Hoje</small><strong>${todayN}</strong></div><div class="v081-metric"><small>Próximos 7 dias</small><strong>${next7}</strong></div><div class="v081-metric"><small>Atrasados</small><strong>${overdue}</strong></div></div><div class="v081-actions"><button class="v081-btn" id="exportAgendaCsv">Exportar agenda CSV</button></div><div class="v081-note">Resumo calculado a partir dos follow-ups cadastrados nas oportunidades.</div>`;
    const panel=root.querySelector('.panel')||root;const p=panel.querySelector('p');if(p)p.insertAdjacentElement('afterend',box);else panel.prepend(box);
    box.querySelector('#exportAgendaCsv').onclick=()=>{const rows=[['Oportunidade','Cidade','Anunciante','Status','Follow-up']];ops.sort((a,b)=>new Date(a.followUp)-new Date(b.followUp)).forEach(o=>rows.push([o.title,o.city,o.advertiser,o.status,new Date(o.followUp).toLocaleString('pt-BR')]));downloadCsv('betel-radar-agenda.csv',rows)};
  }
  function tableRows(table){return [...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(c=>c.innerText.trim()))}
  function patchFinance(){
    const root=document.getElementById('financeView');if(!root||document.getElementById('financeProductivity'))return;const table=root.querySelector('table');if(!table)return;
    const box=document.createElement('div');box.id='financeProductivity';box.className='v081-toolbar';box.innerHTML=`<div class="v081-actions"><input id="financeSearch" class="v081-search" type="search" placeholder="Buscar oportunidade ou anunciante"><button class="v081-btn" id="exportFinanceCsv">Exportar financeiro CSV</button></div><div class="v081-note">Toque ou clique em uma linha para abrir a ficha da oportunidade.</div>`;
    table.insertAdjacentElement('beforebegin',box);
    const tbody=table.querySelector('tbody');const filter=()=>{const q=box.querySelector('#financeSearch').value.trim().toLocaleLowerCase('pt-BR');if(!tbody)return;[...tbody.querySelectorAll('tr')].forEach(tr=>tr.style.display=!q||tr.innerText.toLocaleLowerCase('pt-BR').includes(q)?'':'none')};
    box.querySelector('#financeSearch').addEventListener('input',filter);
    box.querySelector('#exportFinanceCsv').onclick=()=>{const rows=tableRows(table).filter((r,i)=>i===0||![...table.querySelectorAll('tbody tr')][i-1]?.style.display);downloadCsv('betel-radar-financeiro.csv',rows)};
    if(tbody)[...tbody.querySelectorAll('tr')].forEach(tr=>{tr.classList.add('v081-row-link');tr.addEventListener('click',e=>{if(e.target.closest('button,input,select,a'))return;const title=tr.cells?.[0]?.innerText.trim();const op=safeOps().find(o=>String(o.title).trim()===title);if(op&&typeof openDetail==='function')openDetail(op.id)})});
  }
  function patchMessages(){
    const root=document.getElementById('messagesView');if(!root)return;const ta=root.querySelector('textarea');if(!ta||ta.dataset.v081Counter)return;ta.dataset.v081Counter='1';const count=document.createElement('div');count.className='v081-charcount';const refresh=()=>count.textContent=`${ta.value.length} caracteres`;ta.insertAdjacentElement('afterend',count);ta.addEventListener('input',refresh);root.addEventListener('click',()=>setTimeout(refresh,60));refresh();
  }
  function patchCurrent(view){if(view==='agenda')patchAgenda();if(view==='financeiro')patchFinance();if(view==='mensagens')patchMessages();if(view==='config')updateVersion()}
  document.addEventListener('click',e=>{const nav=e.target.closest('.nav-item');if(nav){const v=nav.dataset.view;setTimeout(()=>patchCurrent(v),100);setTimeout(()=>patchCurrent(v),350)}});
  if(typeof window.renderAgenda==='function'){const old=window.renderAgenda;window.renderAgenda=function(){const r=old.apply(this,arguments);setTimeout(patchAgenda,0);return r}}
  if(typeof window.renderFinanceiro==='function'){const old=window.renderFinanceiro;window.renderFinanceiro=function(){const r=old.apply(this,arguments);setTimeout(patchFinance,0);return r}}
  if(typeof window.renderMessages==='function'){const old=window.renderMessages;window.renderMessages=function(){const r=old.apply(this,arguments);setTimeout(patchMessages,0);return r}}
  setTimeout(()=>{updateVersion();patchAgenda();patchFinance();patchMessages()},700);
})();
