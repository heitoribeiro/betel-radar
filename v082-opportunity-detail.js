/* Betel Radar v0.8.2 — ficha de origem e verificação, build 8210 */
(function(){
  const BUILD='8210';
  let currentId=null;
  let neutralTimer=null;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
  function visible(el){if(!el||!(el instanceof Element))return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')return false;const r=el.getBoundingClientRect();return r.width>40&&r.height>40&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth}
  function fmtDate(v){if(!v)return 'Não informado';const d=new Date(v);return isNaN(d)?'Não informado':d.toLocaleString('pt-BR')}
  function money(v){if(v===null||v===undefined||v==='')return 'Não informado';const n=Number(v);return Number.isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'Não informado'}
  function validUrl(v){try{const u=new URL(String(v||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}}
  function getOp(id){return (Array.isArray(window.opportunities)?window.opportunities:[]).find(o=>String(o?.id)===String(id))||null}
  function sourceLabel(op){return op?.sourceLabel||(/viva/i.test(op?.portalSource||op?.source||'')?'Viva Real':/olx/i.test(op?.portalSource||op?.source||'')?'OLX':'Web')}
  function discoveryLabel(op){if(op?.verificationStatus==='verified')return 'Verificado pela fonte';return op?.discoveredVia==='brave_search'?'Descoberto via Brave Search':'Descoberto em pesquisa web'}
  function locationLabel(op){return op?.locationPrecisionLabel||({exact:'Localização exata informada',address:'Localização aproximada — endereço',neighborhood:'Localização aproximada — bairro/localidade',city:'Localização aproximada — município'}[op?.geocodePrecision]||((Array.isArray(op?.coords)&&op.coords.length===2)?'Localização disponível':'Sem localização suficiente'))}

  function installStyles(){
    if(document.getElementById('v082OpportunityDetailStyles'))return;
    const s=document.createElement('style');s.id='v082OpportunityDetailStyles';s.textContent=`
      .v082-detail-host{min-width:0!important}
      .v082-origin-panel{grid-column:1/-1!important;flex:0 0 100%!important;width:auto!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;margin:16px 0 4px;padding:14px;border:1px solid #e6e1da;border-radius:16px;background:linear-gradient(180deg,#fff 0%,#fbfaf8 100%);box-shadow:0 7px 20px rgba(20,20,20,.04);font-family:inherit;color:#171717;overflow:hidden}
      .v082-origin-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.v082-origin-title{font-size:14px;font-weight:850}.v082-origin-sub{font-size:11px;color:#777;margin-top:2px;line-height:1.4}
      .v082-origin-badges{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.v082-origin-badge{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:850;white-space:nowrap;background:#f1eee8;color:#72563b}.v082-origin-badge.ok{background:#e8f7ef;color:#177a52}.v082-origin-badge.warn{background:#fff3d8;color:#8f6500}
      .v082-origin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.v082-origin-cell{border:1px solid #ece8e2;border-radius:12px;background:#fff;padding:9px 10px;min-width:0}.v082-origin-cell.wide{grid-column:1/-1}.v082-origin-cell small{display:block;font-size:9px;color:#8b8b8b;margin-bottom:3px}.v082-origin-cell b{display:block;font-size:11px;line-height:1.35;overflow-wrap:anywhere}.v082-origin-cell em{display:block;font-style:normal;font-size:9px;color:#777;line-height:1.35;margin-top:3px;overflow-wrap:anywhere}
      .v082-origin-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v082-origin-btn{appearance:none;text-decoration:none;border:1px solid #dcd7d0;background:#fff;color:#171717;border-radius:11px;padding:9px 11px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.v082-origin-btn.primary{background:#171717;border-color:#171717;color:#fff}.v082-origin-btn.disabled{opacity:.5;pointer-events:none}
      .v082-origin-check{margin-top:12px;border-top:1px solid #ece8e2;padding-top:10px}.v082-origin-check h4{font-size:11px;margin:0 0 7px}.v082-origin-check ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.v082-origin-check li{font-size:9px;line-height:1.35;padding:7px 8px;border-radius:10px;background:#f7f6f3;color:#666}.v082-origin-check li.ok{background:#edf8f2;color:#236c4e}.v082-origin-check li.warn{background:#fff7e6;color:#7a5b18}
      @media(max-width:760px){
        .v082-detail-host{display:block!important;grid-template-columns:minmax(0,1fr)!important;flex-direction:column!important;align-items:stretch!important;overflow-x:hidden!important;max-width:100vw!important;width:100%!important;box-sizing:border-box!important}
        .v082-detail-host>*{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}
        .v082-origin-panel{display:block!important;position:relative!important;float:none!important;clear:both!important;width:calc(100% - 32px)!important;max-width:calc(100% - 32px)!important;min-width:0!important;margin:14px 16px 24px!important;padding:12px;border-radius:14px;transform:none!important;inset:auto!important}
        .v082-origin-head{display:block}.v082-origin-badges{justify-content:flex-start;margin-top:8px}.v082-origin-grid,.v082-origin-check ul{grid-template-columns:1fr}.v082-origin-cell.wide{grid-column:auto}.v082-origin-actions{display:grid;grid-template-columns:1fr}.v082-origin-btn{text-align:center;width:100%;box-sizing:border-box;padding:10px}.v082-origin-title{font-size:13px}.v082-origin-sub{font-size:10px}
      }
    `;document.head.appendChild(s)
  }

  function closeControl(el){return el.querySelector?.('[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]')||null}
  function detailHost(op){
    const preferred=['#detailModal','#opportunityDetail','.detail-modal','.opportunity-detail','[role="dialog"]','.modal.show','.modal.open','.drawer.open','.sheet.open'];
    for(const sel of preferred){for(const el of document.querySelectorAll(sel)){if(visible(el)&&(el.textContent||'').includes(op.title||'')&&closeControl(el))return el}}
    const nodes=[...document.querySelectorAll('h1,h2,h3,h4,strong,b')].filter(el=>visible(el)&&(el.textContent||'').trim()===(op.title||'').trim());
    for(const node of nodes){
      let el=node;
      while(el&&el!==document.body){
        const cs=getComputedStyle(el),r=el.getBoundingClientRect(),sig=`${el.id||''} ${el.className||''}`;
        const modalish=/detail|modal|drawer|sheet|dialog|overlay/i.test(sig)||cs.position==='fixed';
        if(modalish&&closeControl(el)&&r.width>=Math.min(300,innerWidth*.72)&&r.height>=220)return el;
        el=el.parentElement
      }
    }
    return null
  }

  function checklist(op){
    const advertiser=String(op.advertiser||'');
    const advertiserOk=advertiser&&!/não identificado|nao identificado/i.test(advertiser);
    const priceOk=op.price!==null&&op.price!==undefined&&op.price!==''&&Number.isFinite(Number(op.price));
    const areaOk=op.areaM2!==null&&op.areaM2!==undefined&&op.areaM2!==''&&Number.isFinite(Number(op.areaM2))&&Number(op.areaM2)>0;
    const imgs=Array.isArray(op.images)?op.images:[];
    const locationOk=Array.isArray(op.coords)&&op.coords.length===2;
    return [
      [advertiserOk,'Anunciante identificado','Localizar anunciante/contato no anúncio'],
      [priceOk,'Preço informado','Preço não capturado pelo índice'],
      [areaOk,'Área informada','Área precisa ser confirmada'],
      [locationOk,'Localização disponível no mapa','Localização ainda insuficiente para o mapa'],
      [imgs.length>0,'Imagens capturadas','Fotos precisam ser verificadas no portal'],
      [false,'Drone/360º verificados','Verificar material visual antes da abordagem']
    ]
  }

  function panelHtml(op){
    const portal=sourceLabel(op);const discovery=discoveryLabel(op);const verified=op.verificationStatus==='verified';const url=validUrl(op.url||op.sourceUrl||op.source_url);const items=checklist(op);
    const area=(op.areaM2!==null&&op.areaM2!==undefined&&op.areaM2!==''&&Number.isFinite(Number(op.areaM2)))?Number(op.areaM2).toLocaleString('pt-BR')+' m²':'Não informada';
    const loc=locationLabel(op);const locRef=op.geocodeLabel||[op.neighborhood,op.city].filter(Boolean).join(', ');
    return `<div class="v082-origin-head"><div><div class="v082-origin-title">Origem e verificação</div><div class="v082-origin-sub">Dados reais/prováveis usados para prospecção assistida. Confirme as informações no portal antes do contato.</div></div><div class="v082-origin-badges"><span class="v082-origin-badge">${esc(portal)}</span><span class="v082-origin-badge ${verified?'ok':'warn'}">${esc(discovery)}</span></div></div><div class="v082-origin-grid"><div class="v082-origin-cell"><small>Portal</small><b>${esc(portal)}</b></div><div class="v082-origin-cell"><small>Status de verificação</small><b>${verified?'Confirmado pela fonte':'Descoberto — disponibilidade não confirmada'}</b></div><div class="v082-origin-cell"><small>Preço capturado</small><b>${esc(money(op.price))}</b></div><div class="v082-origin-cell"><small>Área capturada</small><b>${esc(area)}</b></div><div class="v082-origin-cell wide"><small>Localização no mapa</small><b>${esc(loc)}</b>${locRef?`<em>Referência usada: ${esc(locRef)}</em>`:''}</div><div class="v082-origin-cell"><small>Primeira detecção</small><b>${esc(fmtDate(op.firstSeen||op.first_seen_at))}</b></div><div class="v082-origin-cell"><small>Última detecção</small><b>${esc(fmtDate(op.lastSeen||op.last_seen_at))}</b></div></div><div class="v082-origin-actions">${url?`<a class="v082-origin-btn primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir anúncio original ↗</a><button type="button" class="v082-origin-btn" data-v082-copy-url="${esc(url)}">Copiar link</button>`:`<span class="v082-origin-btn disabled">URL do anúncio indisponível</span>`}</div><div class="v082-origin-check"><h4>Antes da abordagem comercial</h4><ul>${items.map(([ok,yes,no])=>`<li class="${ok?'ok':'warn'}">${ok?'✓':'◌'} ${esc(ok?yes:no)}</li>`).join('')}</ul></div>`
  }

  function inject(id=currentId){
    const op=getOp(id);if(!op||!op.sourceListing)return false;
    const host=detailHost(op);if(!host)return false;
    installStyles();
    document.querySelectorAll('.v082-detail-host').forEach(el=>{if(el!==host)el.classList.remove('v082-detail-host')});
    host.classList.add('v082-detail-host');
    let panel=host.querySelector('#v082SourceDetailPanel');
    if(!panel){document.querySelector('#v082SourceDetailPanel')?.remove();panel=document.createElement('section');panel.id='v082SourceDetailPanel';panel.className='v082-origin-panel';host.appendChild(panel)}
    panel.innerHTML=panelHtml(op);return true
  }
  function scheduleInject(id=currentId){[40,150,360].forEach(ms=>setTimeout(()=>{if(currentId!==null&&String(currentId)===String(id))inject(id)},ms))}

  function cardFor(op){
    const nodes=[...document.querySelectorAll('strong,h2,h3,h4,b')].filter(el=>visible(el)&&(el.textContent||'').trim()===(op.title||'').trim());
    for(const node of nodes){
      const direct=node.closest('.opportunity-card,.radar-card,.visual-card,.card,article,li,tr');if(direct)return direct;
      let el=node.parentElement;while(el&&el!==document.body){const r=el.getBoundingClientRect();if(r.width>220&&r.height>80&&r.height<650)return el;el=el.parentElement}
    }
    return null
  }
  function neutralizeUnverifiedVisuals(){
    const ops=(Array.isArray(window.opportunities)?window.opportunities:[]).filter(o=>o?.sourceListing&&o.verificationStatus!=='verified');
    for(const op of ops){const card=cardFor(op);if(!card)continue;for(const el of card.querySelectorAll('span,small,div')){if(el.children.length)continue;const t=(el.textContent||'').trim();if(/^❌?\s*Sem drone$/i.test(t))el.textContent='◌ Drone não verificado';else if(/^❌?\s*Sem 360(?:°|º)?$/i.test(t)||/^360(?:°|º)\s*Não$/i.test(t))el.textContent='◌ 360º não verificado';else if(/^\d+\s*fotos?$/i.test(t)&&!(Array.isArray(op.images)&&op.images.length))el.textContent='◌ Fotos não verificadas';else if(/^⚠️?\s*Visual\s+(fraco|médio|medio|bom)$/i.test(t))el.textContent='◌ Visual não verificado'}}
  }
  function scheduleNeutralize(delay=120){clearTimeout(neutralTimer);neutralTimer=setTimeout(neutralizeUnverifiedVisuals,delay)}

  function wrapOpenDetail(){
    if(typeof window.openDetail!=='function')return false;if(window.openDetail.__v082OriginWrapped)return true;
    const original=window.openDetail;
    const wrapped=function(id){currentId=id;const r=original.apply(this,arguments);scheduleInject(id);return r};
    wrapped.__v082OriginWrapped=true;if(original.__betelLayerWrapped)wrapped.__betelLayerWrapped=true;window.openDetail=wrapped;return true
  }
  function cleanupDetail(){currentId=null;document.getElementById('v082SourceDetailPanel')?.remove();document.querySelectorAll('.v082-detail-host').forEach(el=>el.classList.remove('v082-detail-host'))}

  document.addEventListener('click',e=>{
    const copy=e.target.closest?.('[data-v082-copy-url]');if(copy){e.preventDefault();const url=copy.getAttribute('data-v082-copy-url');navigator.clipboard?.writeText(url).then(()=>{const old=copy.textContent;copy.textContent='Link copiado ✓';setTimeout(()=>copy.textContent=old,1300)}).catch(()=>{});return}
    if(e.target.closest?.('[onclick*="closeDetail"],.close-detail,.modal-close,[aria-label="Fechar"],[aria-label="Close"],button[class*="close"]')){setTimeout(cleanupDetail,30);return}
    const trigger=e.target.closest?.('[onclick*="openDetail"]');if(trigger){const m=(trigger.getAttribute('onclick')||'').match(/openDetail\((\d+)\)/);if(m){currentId=m[1];scheduleInject(currentId)}}
    if(e.target.closest?.('.nav-item,.bottom-nav,.mobile-bottom-nav,[data-section],[onclick*="showSection"],[onclick*="navigate"]')){cleanupDetail();setTimeout(wrapOpenDetail,180);scheduleNeutralize(220)}
  },true);
  window.addEventListener('betel:real-data-ready',()=>{wrapOpenDetail();scheduleNeutralize(140)});
  window.addEventListener('pageshow',()=>{wrapOpenDetail();scheduleNeutralize(350)});
  installStyles();wrapOpenDetail();scheduleNeutralize(850);
  setInterval(wrapOpenDetail,2500);
  window.__BETEL_DETAIL_ENRICHMENT__={build:BUILD,inject,neutralizeUnverifiedVisuals};
})();
