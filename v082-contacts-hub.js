/* Betel Radar v0.8.2 — Central de Contatos, build 8244 */
(function(){
  'use strict';

  const BUILD='8244';
  let scheduled=false;
  let loading=false;
  let rowsCache=[];
  let lastLoadedAt=0;

  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const digits=v=>String(v||'').replace(/\D/g,'');

  function visible(el){
    if(!el||!(el instanceof Element))return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')return false;
    const r=el.getBoundingClientRect();
    return r.width>1&&r.height>1;
  }

  function isContactsTitle(text){
    const t=norm(text).toLowerCase();
    return t==='contatos'||t==='contatos e prospects'||t.startsWith('contatos e prospect');
  }

  function installStyles(){
    if(document.getElementById('v082ContactsHubStyles'))return;
    const s=document.createElement('style');
    s.id='v082ContactsHubStyles';
    s.textContent=`
      #v082ContactsHub{margin:14px 0 20px;border:1px solid #e5e2dc;border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(20,20,20,.045);overflow:hidden;box-sizing:border-box;width:100%;max-width:100%;color:#171717}
      .v082-contacts-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 17px;border-bottom:1px solid #ece9e4;background:linear-gradient(90deg,#fbfaf7,#fff)}
      .v082-contacts-head h3{margin:0;font-size:16px;line-height:1.25}.v082-contacts-head p{margin:4px 0 0;font-size:11px;line-height:1.4;color:#777}
      .v082-contacts-refresh{appearance:none;border:1px solid #dedad4;background:#fff;border-radius:11px;padding:8px 10px;font:inherit;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}
      .v082-contacts-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:14px 16px 4px}
      .v082-contacts-kpi{border:1px solid #ece8e2;background:#fafafa;border-radius:13px;padding:10px 11px;min-width:0}.v082-contacts-kpi small{display:block;color:#7c7c7c;font-size:9px;line-height:1.2}.v082-contacts-kpi b{display:block;margin-top:4px;font-size:21px;line-height:1;color:#171717}
      .v082-contacts-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;padding:12px 16px}.v082-contacts-search{width:100%;box-sizing:border-box;border:1px solid #ddd9d3;border-radius:12px;padding:10px 12px;font:inherit;font-size:11px;background:#fff;outline:none}.v082-contacts-search:focus{border-color:#b58a5d;box-shadow:0 0 0 3px rgba(181,138,93,.10)}
      .v082-contacts-filter{border:1px solid #ddd9d3;border-radius:12px;padding:9px 10px;background:#fff;font:inherit;font-size:10px;color:#333}
      .v082-contacts-list{display:grid;gap:9px;padding:0 16px 16px}.v082-contact-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #e9e6e0;border-radius:15px;padding:12px;background:#fff;min-width:0}.v082-contact-main{min-width:0}.v082-contact-name{font-size:13px;font-weight:850;line-height:1.25;overflow-wrap:anywhere}.v082-contact-meta{font-size:10px;color:#777;line-height:1.45;margin-top:3px;overflow-wrap:anywhere}.v082-contact-op{font-size:10px;color:#4e4e4e;line-height:1.4;margin-top:5px;overflow-wrap:anywhere}.v082-contact-channel{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.v082-contact-chip{display:inline-flex;align-items:center;max-width:100%;padding:4px 7px;border-radius:999px;background:#f4f2ee;color:#5b5146;font-size:9px;font-weight:750;overflow-wrap:anywhere}.v082-contact-chip.good{background:#e8f7ef;color:#177a52}
      .v082-contact-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.v082-contact-btn{appearance:none;border:1px solid #dedad4;background:#fff;color:#171717;border-radius:10px;padding:8px 9px;font:inherit;font-size:9px;font-weight:800;cursor:pointer;text-decoration:none;white-space:nowrap}.v082-contact-btn.primary{background:#171717;border-color:#171717;color:#fff}
      .v082-contacts-empty{margin:0 16px 16px;padding:18px 16px;border:1px dashed #ddd8d0;border-radius:15px;background:#faf9f6;text-align:center;color:#666;font-size:11px;line-height:1.5}.v082-contacts-empty b{display:block;color:#222;font-size:13px;margin-bottom:4px}.v082-contacts-empty button{margin-top:10px}
      .v082-native-contact-empty-hidden{display:none!important}.v082-contact-row[data-hidden="1"]{display:none!important}
      body.betel-compact-desktop .v082-contacts-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
      @media(min-width:761px) and (max-width:1100px){.v082-contacts-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.v082-contact-row{grid-template-columns:1fr}.v082-contact-actions{justify-content:flex-start}}
      @media(max-width:760px){#v082ContactsHub{margin:12px 0 18px;border-radius:17px}.v082-contacts-head{padding:13px 14px}.v082-contacts-head h3{font-size:14px}.v082-contacts-kpis{grid-template-columns:repeat(2,minmax(0,1fr));padding:11px 12px 3px;gap:7px}.v082-contacts-tools{grid-template-columns:1fr;padding:10px 12px}.v082-contacts-list{padding:0 12px 12px}.v082-contact-row{grid-template-columns:1fr;padding:11px}.v082-contact-actions{justify-content:flex-start}.v082-contact-btn{flex:1;text-align:center}.v082-contacts-empty{margin:0 12px 12px}}
    `;
    document.head.appendChild(s);
  }

  function heading(){
    const headings=[...document.querySelectorAll('h1,h2,h3')].filter(visible);
    return headings.find(el=>isContactsTitle(el.textContent))||null;
  }

  function viewRoot(){
    const h=heading();
    if(!h)return null;
    return document.getElementById('contactsView')||h.closest('.view,.content-view,.page,.panel,main')||h.parentElement?.parentElement||h.parentElement;
  }

  function insertAnchor(root,h){
    if(!root||!h)return null;
    let anchor=h;
    const next=h.nextElementSibling;
    if(next&&/contato|anunciante|prospec|consolida/i.test(norm(next.textContent)))anchor=next;
    if(anchor.parentElement!==root){
      let n=anchor;
      while(n.parentElement&&n.parentElement!==root){
        const p=n.parentElement;
        const r=p.getBoundingClientRect();
        if(r.width<root.getBoundingClientRect().width*.55)break;
        n=p;
      }
      anchor=n;
    }
    return anchor;
  }

  function hasContact(r){return !!norm(r?.contact_name||r?.company||r?.phone||r?.email)}
  function activeRows(){return rowsCache.filter(hasContact)}

  function fmtDate(v){
    if(!v)return '';
    const d=new Date(v);if(Number.isNaN(d.getTime()))return '';
    return d.toLocaleDateString('pt-BR');
  }

  function waUrl(phone){
    let d=digits(phone);if(!d)return '';
    if(!d.startsWith('55')&&(d.length===10||d.length===11))d='55'+d;
    return d.length>=12?`https://wa.me/${d}`:'';
  }

  function sourceKey(op){
    const s=String(op?.portalSource||op?.sourceLabel||op?.source||'').toLowerCase();
    return s.includes('viva')?'vivareal':s.includes('olx')?'olx':s.replace(/\s.+$/,'');
  }

  function findOp(row){
    const list=Array.isArray(window.opportunities)?window.opportunities:[];
    return list.find(o=>String(o?.id)===String(row.listing_id))||list.find(o=>sourceKey(o)===String(row.source||'').toLowerCase()&&String(o?.externalId||o?.external_id||'')===String(row.external_id||''))||null;
  }

  function stats(){
    const contacts=activeRows();
    const phones=contacts.filter(r=>norm(r.phone)).length;
    const emails=contacts.filter(r=>norm(r.email)).length;
    const live=Array.isArray(window.opportunities)?window.opportunities.filter(Boolean).length:0;
    const covered=new Set(contacts.map(r=>String(r.listing_id||`${r.source}:${r.external_id}`)));
    const without=Math.max(0,live-covered.size);
    return {contacts:contacts.length,phones,emails,without};
  }

  async function load(force=false){
    if(loading)return rowsCache;
    if(!force&&lastLoadedAt&&Date.now()-lastLoadedAt<30000)return rowsCache;
    if(!window.__BETEL_ADMIN_TOOLS__?.rpc)throw new Error('Sessão administrativa ainda não carregada.');
    loading=true;
    try{
      const data=await window.__BETEL_ADMIN_TOOLS__.rpc('radar_list_prospect_contacts',{});
      rowsCache=Array.isArray(data)?data:[];
      lastLoadedAt=Date.now();
      return rowsCache;
    }finally{loading=false}
  }

  function hideNativeEmpty(root){
    [...root.querySelectorAll('div,p,span')].forEach(el=>{
      if(el.closest('#v082ContactsHub'))return;
      const t=norm(el.textContent).toLowerCase();
      if((t.includes('nenhum contato')||t.includes('nenhum anunciante'))&&el.children.length<4)el.classList.add('v082-native-contact-empty-hidden');
    });
  }

  function rowHtml(r){
    const name=norm(r.contact_name)||norm(r.company)||'Contato sem nome';
    const company=norm(r.company)&&norm(r.company)!==name?norm(r.company):'';
    const phone=norm(r.phone),email=norm(r.email),wa=waUrl(phone),verified=fmtDate(r.contact_verified_at);
    const listing=norm(r.listing_title)||'Oportunidade';
    const city=norm(r.city)||'Local não informado';
    const source=String(r.source||'').toUpperCase();
    return `<article class="v082-contact-row" data-contact-search="${esc([name,company,phone,email,listing,city,source].join(' ').toLowerCase())}" data-contact-channel="${phone?'phone ':''}${email?'email':''}">
      <div class="v082-contact-main">
        <div class="v082-contact-name">${esc(name)}</div>
        <div class="v082-contact-meta">${company?esc(company)+' · ':''}${esc(city)}${verified?' · verificado em '+esc(verified):''}</div>
        <div class="v082-contact-op">${esc(listing)}${source?' · '+esc(source):''}</div>
        <div class="v082-contact-channel">${phone?`<span class="v082-contact-chip good">📱 ${esc(phone)}</span>`:''}${email?`<span class="v082-contact-chip">✉ ${esc(email)}</span>`:''}${r.preferred_channel?`<span class="v082-contact-chip">Preferência: ${esc(r.preferred_channel)}</span>`:''}</div>
      </div>
      <div class="v082-contact-actions">
        <button type="button" class="v082-contact-btn primary" data-v082-contact-open="${esc(String(r.source||''))}" data-external-id="${esc(String(r.external_id||''))}" data-listing-id="${esc(String(r.listing_id||''))}">Abrir oportunidade</button>
        ${wa?`<a class="v082-contact-btn" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>`:''}
        ${email?`<a class="v082-contact-btn" href="mailto:${esc(email)}">E-mail ↗</a>`:''}
      </div>
    </article>`;
  }

  function renderShell(root,h){
    let hub=document.getElementById('v082ContactsHub');
    if(hub&&hub.parentElement!==root)hub.remove();
    hub=document.getElementById('v082ContactsHub');
    if(!hub){
      hub=document.createElement('section');hub.id='v082ContactsHub';
      const anchor=insertAnchor(root,h);
      if(anchor&&anchor.parentElement)anchor.insertAdjacentElement('afterend',hub);else root.appendChild(hub);
    }
    return hub;
  }

  function applyFilter(){
    const hub=document.getElementById('v082ContactsHub');if(!hub)return;
    const q=norm(hub.querySelector('#v082ContactsSearch')?.value).toLowerCase();
    const channel=hub.querySelector('#v082ContactsFilter')?.value||'all';
    [...hub.querySelectorAll('.v082-contact-row')].forEach(row=>{
      const matchText=!q||String(row.dataset.contactSearch||'').includes(q);
      const channels=String(row.dataset.contactChannel||'');
      const matchChannel=channel==='all'||channels.includes(channel);
      row.dataset.hidden=matchText&&matchChannel?'0':'1';
    });
  }

  function paint(){
    const root=viewRoot(),h=heading();
    if(!root||!h)return false;
    installStyles();hideNativeEmpty(root);
    const hub=renderShell(root,h);
    const s=stats(),contacts=activeRows();
    hub.innerHTML=`
      <div class="v082-contacts-head"><div><h3>Central de contatos</h3><p>Contatos públicos homologados nas oportunidades do Radar. Os prospects identificados continuam visíveis abaixo.</p></div><button type="button" class="v082-contacts-refresh" id="v082ContactsRefresh">↻ Atualizar</button></div>
      <div class="v082-contacts-kpis"><div class="v082-contacts-kpi"><small>Contatos registrados</small><b>${s.contacts}</b></div><div class="v082-contacts-kpi"><small>Com telefone</small><b>${s.phones}</b></div><div class="v082-contacts-kpi"><small>Com e-mail</small><b>${s.emails}</b></div><div class="v082-contacts-kpi"><small>Oportunidades sem contato</small><b>${s.without}</b></div></div>
      <div class="v082-contacts-tools"><input id="v082ContactsSearch" class="v082-contacts-search" type="search" placeholder="Buscar nome, empresa, telefone, imóvel ou cidade"><select id="v082ContactsFilter" class="v082-contacts-filter"><option value="all">Todos os canais</option><option value="phone">Com telefone</option><option value="email">Com e-mail</option></select></div>
      ${contacts.length?`<div class="v082-contacts-list">${contacts.map(rowHtml).join('')}</div>`:`<div class="v082-contacts-empty"><b>Nenhum contato homologado ainda</b>Os cartões de prospects abaixo agrupam os anunciantes já identificados. Para transformar um prospect em contato, abra uma oportunidade e use <strong>Prospecção assistida → Registrar contato</strong>.<br><button type="button" class="v082-contact-btn primary" id="v082ContactsGoRadar">Ir para o Radar</button></div>`}
    `;
    hub.dataset.build=BUILD;
    document.body?.setAttribute('data-betel-contacts-hub',BUILD);
    return true;
  }

  async function refresh(force=false){
    scheduled=false;
    if(!heading())return;
    try{
      await load(force);
      paint();
    }catch(err){
      const root=viewRoot(),h=heading();if(!root||!h)return;
      const hub=renderShell(root,h);hub.innerHTML=`<div class="v082-contacts-head"><div><h3>Central de contatos</h3><p>Não foi possível carregar os contatos: ${esc(err?.message||err)}</p></div><button type="button" class="v082-contacts-refresh" id="v082ContactsRefresh">Tentar novamente</button></div>`;
    }
  }

  function schedule(delay=0,force=false){
    if(delay){setTimeout(()=>schedule(0,force),delay);return}
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>refresh(force));
  }

  document.addEventListener('input',e=>{if(e.target?.id==='v082ContactsSearch')applyFilter()},true);
  document.addEventListener('change',e=>{if(e.target?.id==='v082ContactsFilter')applyFilter()},true);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#v082ContactsRefresh')){rowsCache=[];lastLoadedAt=0;schedule(0,true);return}
    if(e.target.closest?.('#v082ContactsGoRadar')){
      const nav=[...document.querySelectorAll('.nav-item,[data-view]')].find(el=>norm(el.textContent).toLowerCase()==='radar'||norm(el.getAttribute?.('data-view')).toLowerCase()==='radar');nav?.click();return
    }
    const open=e.target.closest?.('[data-v082-contact-open]');
    if(open){
      const row={source:open.getAttribute('data-v082-contact-open'),external_id:open.getAttribute('data-external-id'),listing_id:open.getAttribute('data-listing-id')};
      const op=findOp(row);
      if(op&&typeof window.openDetail==='function')window.openDetail(Number.isFinite(Number(op.id))?Number(op.id):op.id);
      return
    }
    const nav=e.target.closest?.('.nav-item,[data-view],[data-section],[onclick*="showSection"],[onclick*="navigate"]');
    if(nav){
      const t=norm(nav.textContent).toLowerCase(),v=norm(nav.getAttribute?.('data-view')).toLowerCase();
      if(t.includes('contatos')||v==='contatos'||v==='contacts'){schedule(80);schedule(260);schedule(700)}
    }
    if(e.target.closest?.('[data-v082-contact-edit], [data-v082-contact-save], .v082-contact-actions .primary')){rowsCache=[];lastLoadedAt=0;schedule(900,true)}
  },true);

  window.addEventListener('betel:real-data-ready',()=>{rowsCache=[];lastLoadedAt=0;schedule(180,true)});
  window.addEventListener('betel:opportunities-synced',()=>{rowsCache=[];lastLoadedAt=0;schedule(220,true)});
  window.addEventListener('pageshow',()=>{schedule(220);schedule(700);schedule(1300)});
  window.addEventListener('focus',()=>{if(heading())schedule(150)});

  const observer=new MutationObserver(mutations=>{
    if(!heading())return;
    if(mutations.some(m=>m.type==='childList'))schedule(80);
  });

  function start(){
    if(!document.body){setTimeout(start,50);return}
    installStyles();observer.observe(document.body,{childList:true,subtree:true});schedule(350);schedule(900);schedule(1600);
    window.__BETEL_CONTACTS_HUB__={build:BUILD,refresh:()=>{rowsCache=[];lastLoadedAt=0;schedule(0,true)}};
  }
  start();
})();