/* Betel Radar v0.8.2 — correção manual de dados, build 8214 */
(function(){
  const BUILD='8214';
  const SUPABASE_URL='https://asnjlaxhbehzhisandmz.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_JCp12LZjTSgH7mi-X-eOvg_hILh1fb3';
  let currentId=null;
  let lastLoad=0;
  let loading=null;
  const overrides=new Map();

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
  function sourceKey(op){const s=String(op?.portalSource||op?.sourceLabel||op?.source||'').toLowerCase();return s.includes('viva')?'vivareal':s.includes('olx')?'olx':s.replace(/\s.+$/,'')}
  function keyOf(op){return `${sourceKey(op)}:${String(op?.externalId||op?.external_id||'')}`}
  function getOp(id){return (Array.isArray(window.opportunities)?window.opportunities:[]).find(o=>String(o?.id)===String(id))||null}
  function hasManual(o){return o&&((o.manual_price!==null&&o.manual_price!==undefined)||(o.manual_area_m2!==null&&o.manual_area_m2!==undefined)||String(o.manual_advertiser||'').trim())}
  function deepToken(v,depth=0){if(!v||depth>4)return '';if(typeof v==='object'){if(typeof v.access_token==='string')return v.access_token;for(const k of ['currentSession','session','data','value']){const t=deepToken(v[k],depth+1);if(t)return t}}return ''}
  function accessToken(){for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/^sb-.*-auth-token$/.test(k))continue;try{const t=deepToken(JSON.parse(localStorage.getItem(k)||'null'));if(t)return t}catch{}}return ''}
  async function rpc(name,body){
    if(window.__BETEL_ADMIN_TOOLS__?.rpc)return window.__BETEL_ADMIN_TOOLS__.rpc(name,body);
    const token=accessToken();if(!token)throw new Error('Sessão do Betel Cloud não encontrada. Entre novamente em Configurações.');
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body||{})});
    const text=await r.text();if(!r.ok)throw new Error(text?(()=>{try{return JSON.parse(text)?.message||text}catch{return text}})():`HTTP ${r.status}`);try{return text?JSON.parse(text):null}catch{return text}
  }

  function installStyles(){
    if(document.getElementById('v082DataCorrectionStyles'))return;
    const s=document.createElement('style');s.id='v082DataCorrectionStyles';s.textContent=`
      .v082-data-overlay{position:fixed;inset:0;z-index:1000003;background:rgba(15,15,15,.5);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
      .v082-data-modal{width:min(600px,100%);max-height:min(88vh,760px);overflow:auto;background:#fff;border-radius:22px;padding:18px;box-shadow:0 30px 80px rgba(0,0,0,.25);font-family:inherit;color:#171717}
      .v082-data-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.v082-data-head h3{margin:0;font-size:20px}.v082-data-head p{margin:4px 0 0;color:#777;font-size:12px;line-height:1.4}.v082-data-close{border:1px solid #ddd;background:#fff;border-radius:12px;width:38px;height:38px;font-size:22px;cursor:pointer}
      .v082-data-current{margin:12px 0;padding:10px 12px;border-radius:12px;background:#f7f6f3;font-size:11px;line-height:1.45;color:#666}.v082-data-current b{color:#222}
      .v082-data-row{border:1px solid #e3dfd8;border-radius:14px;padding:11px 12px;margin-top:9px}.v082-data-row label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800}.v082-data-row input[type="number"],.v082-data-row input[type="text"]{width:100%;box-sizing:border-box;margin-top:8px;border:1px solid #d9d5cf;border-radius:11px;padding:10px 11px;font:inherit;font-size:13px;background:#fff}.v082-data-row input:disabled{background:#f4f3f1;color:#999}
      .v082-data-note{width:100%;min-height:72px;resize:vertical;border:1px solid #d9d5cf;border-radius:12px;padding:10px;box-sizing:border-box;font:inherit;font-size:12px;margin-top:10px}.v082-data-hint{font-size:10px;color:#888;line-height:1.4;margin-top:5px}
      .v082-data-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.v082-data-actions button{border:1px solid #ddd;background:#fff;border-radius:12px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer}.v082-data-actions .primary{background:#171717;color:#fff;border-color:#171717}.v082-data-status{margin-top:10px;font-size:11px;color:#666;min-height:16px}
      @media(max-width:760px){.v082-data-overlay{padding:8px;align-items:flex-end}.v082-data-modal{border-radius:20px 20px 0 0;max-height:92vh;padding:14px}.v082-data-actions{display:grid;grid-template-columns:1fr 1fr}.v082-data-actions button{width:100%}}
    `;document.head.appendChild(s)
  }

  async function loadOverrides(force=false){
    if(!force&&Date.now()-lastLoad<120000&&overrides.size)return overrides;
    if(loading)return loading;
    loading=(async()=>{
      const url=`${SUPABASE_URL}/rest/v1/source_listings?availability_status=eq.active&select=source,external_id,price,area_m2,advertiser,manual_price,manual_area_m2,manual_advertiser,manual_data_note,manual_data_updated_at`;
      const r=await fetch(url,{headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${PUBLISHABLE_KEY}`,Accept:'application/json'},cache:'no-store'});
      if(!r.ok)throw new Error(`Falha ao carregar correções (${r.status})`);
      const rows=await r.json();overrides.clear();for(const row of rows)overrides.set(`${row.source}:${row.external_id}`,row);lastLoad=Date.now();return overrides
    })().finally(()=>{loading=null});
    return loading
  }

  function applyOne(op,row){
    if(!op||!row)return false;
    op.sourcePrice=num(row.price);op.sourceAreaM2=num(row.area_m2);op.sourceAdvertiser=row.advertiser||'';
    op.manualPrice=num(row.manual_price);op.manualAreaM2=num(row.manual_area_m2);op.manualAdvertiser=row.manual_advertiser||'';op.manualDataNote=row.manual_data_note||'';op.manualDataUpdatedAt=row.manual_data_updated_at||'';
    if(op.manualPrice!==null)op.price=op.manualPrice;
    if(op.manualAreaM2!==null)op.areaM2=op.manualAreaM2;
    if(op.manualAdvertiser)op.advertiser=op.manualAdvertiser;
    op.manualDataOverride=op.manualPrice!==null||op.manualAreaM2!==null||!!op.manualAdvertiser;
    if(op.manualDataOverride){op.tags=Array.isArray(op.tags)?op.tags:[];if(!op.tags.includes('Dados corrigidos manualmente'))op.tags.push('Dados corrigidos manualmente')}
    return op.manualDataOverride
  }

  async function applyAll(force=false,rerender=true){
    try{await loadOverrides(force)}catch(e){console.warn('Betel Radar: correções manuais indisponíveis',e);return}
    const ops=Array.isArray(window.opportunities)?window.opportunities:[];let changed=false;
    for(const op of ops){const row=overrides.get(keyOf(op));if(row)changed=applyOne(op,row)||changed}
    window.__BETEL_DATA_CORRECTIONS__={build:BUILD,count:[...overrides.values()].filter(hasManual).length,updatedAt:new Date().toISOString()};
    if(rerender&&changed&&typeof window.renderAll==='function'){try{window.renderAll()}catch{}}
    if(currentId!==null)setTimeout(()=>injectButton(currentId),140)
  }

  function markBadge(op){
    const panel=document.getElementById('v082SourceDetailPanel');if(!panel||!op?.manualDataOverride)return;
    const badges=panel.querySelector('.v082-origin-badges');if(badges&&!badges.querySelector('[data-v082-manual-badge]')){const s=document.createElement('span');s.className='v082-origin-badge ok';s.setAttribute('data-v082-manual-badge','1');s.textContent='Dados corrigidos';badges.appendChild(s)}
  }

  function injectButton(id=currentId){
    const op=getOp(id);if(!op||!op.sourceListing)return false;const panel=document.getElementById('v082SourceDetailPanel');if(!panel)return false;const actions=panel.querySelector('.v082-origin-actions');if(!actions)return false;
    if(!actions.querySelector('[data-v082-correct-data]')){const b=document.createElement('button');b.type='button';b.className='v082-origin-btn';b.setAttribute('data-v082-correct-data',String(op.id));b.textContent='✏️ Corrigir dados';actions.appendChild(b)}
    markBadge(op);return true
  }
  function schedule(id=currentId){[80,220,520].forEach(ms=>setTimeout(()=>injectButton(id),ms))}

  function openModal(op){
    installStyles();document.querySelector('.v082-data-overlay')?.remove();
    const priceManual=op.manualPrice!==null&&op.manualPrice!==undefined;const areaManual=op.manualAreaM2!==null&&op.manualAreaM2!==undefined;const advManual=!!String(op.manualAdvertiser||'').trim();
    const priceValue=priceManual?op.manualPrice:(op.sourcePrice??op.price??'');const areaValue=areaManual?op.manualAreaM2:(op.sourceAreaM2??op.areaM2??'');const advValue=advManual?op.manualAdvertiser:(op.sourceAdvertiser||op.advertiser||'');
    const overlay=document.createElement('div');overlay.className='v082-data-overlay';overlay.innerHTML=`<div class="v082-data-modal" role="dialog" aria-modal="true"><div class="v082-data-head"><div><h3>Corrigir dados do anúncio</h3><p>A correção fica separada do dado capturado e não será perdida na próxima sincronização.</p></div><button type="button" class="v082-data-close" aria-label="Fechar">×</button></div><div class="v082-data-current"><b>${esc(op.title)}</b><br>Portal: ${esc(op.sourceLabel||sourceKey(op))} · ID ${esc(op.externalId||op.external_id||'')}</div><div class="v082-data-row"><label><input type="checkbox" id="v082OverridePrice" ${priceManual?'checked':''}> Usar preço corrigido manualmente</label><input type="number" id="v082ManualPrice" min="0" step="1" value="${esc(priceValue)}" ${priceManual?'':'disabled'}><div class="v082-data-hint">Desmarcado = usar o preço capturado automaticamente.</div></div><div class="v082-data-row"><label><input type="checkbox" id="v082OverrideArea" ${areaManual?'checked':''}> Usar área corrigida manualmente</label><input type="number" id="v082ManualArea" min="1" step="1" value="${esc(areaValue)}" ${areaManual?'':'disabled'}><div class="v082-data-hint">Informe a área total em m².</div></div><div class="v082-data-row"><label><input type="checkbox" id="v082OverrideAdvertiser" ${advManual?'checked':''}> Usar anunciante corrigido manualmente</label><input type="text" id="v082ManualAdvertiser" value="${esc(advValue)}" ${advManual?'':'disabled'}><div class="v082-data-hint">Use somente o nome exibido publicamente no anúncio original.</div></div><textarea class="v082-data-note" id="v082DataNote" placeholder="Observação opcional sobre a correção">${esc(op.manualDataNote||'')}</textarea><div class="v082-data-status" id="v082DataStatus"></div><div class="v082-data-actions"><button type="button" data-v082-data-cancel>Cancelar</button><button type="button" class="primary" data-v082-data-save>Salvar correção</button></div></div>`;
    document.body.appendChild(overlay);
    const bind=(check,input)=>{const c=overlay.querySelector(check),i=overlay.querySelector(input);c.onchange=()=>{i.disabled=!c.checked;if(c.checked)i.focus()}};bind('#v082OverridePrice','#v082ManualPrice');bind('#v082OverrideArea','#v082ManualArea');bind('#v082OverrideAdvertiser','#v082ManualAdvertiser');
    const close=()=>overlay.remove();overlay.querySelector('.v082-data-close').onclick=close;overlay.querySelector('[data-v082-data-cancel]').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('[data-v082-data-save]').onclick=async()=>{
      const btn=overlay.querySelector('[data-v082-data-save]'),status=overlay.querySelector('#v082DataStatus');const opPrice=overlay.querySelector('#v082OverridePrice').checked,opArea=overlay.querySelector('#v082OverrideArea').checked,opAdv=overlay.querySelector('#v082OverrideAdvertiser').checked;const price=num(overlay.querySelector('#v082ManualPrice').value),area=num(overlay.querySelector('#v082ManualArea').value),advertiser=overlay.querySelector('#v082ManualAdvertiser').value.trim();
      if(opPrice&&price===null){status.textContent='Informe um preço válido.';return}if(opArea&&(area===null||area<=0)){status.textContent='Informe uma área válida.';return}if(opAdv&&!advertiser){status.textContent='Informe o anunciante.';return}
      btn.disabled=true;status.textContent='Salvando correção…';
      try{
        const row=await rpc('radar_correct_listing_data',{p_source:sourceKey(op),p_external_id:String(op.externalId||op.external_id||''),p_override_price:opPrice,p_price:opPrice?price:null,p_override_area:opArea,p_area_m2:opArea?area:null,p_override_advertiser:opAdv,p_advertiser:opAdv?advertiser:null,p_note:overlay.querySelector('#v082DataNote').value||null});
        status.textContent='Dados corrigidos ✓';
        const normalized=Array.isArray(row)?row[0]:row;if(normalized)overrides.set(keyOf(op),normalized);lastLoad=Date.now();
        if(normalized)applyOne(op,normalized);else{op.manualPrice=opPrice?price:null;op.manualAreaM2=opArea?area:null;op.manualAdvertiser=opAdv?advertiser:'';if(opPrice)op.price=price;if(opArea)op.areaM2=area;if(opAdv)op.advertiser=advertiser}
        if(typeof window.renderAll==='function'){try{window.renderAll()}catch{}}
        setTimeout(async()=>{close();try{await applyAll(true,false)}catch{}try{await window.BetelRadarSync?.syncNow?.()}catch{}},450)
      }catch(err){status.textContent=`Não foi possível salvar: ${err.message||err}`;btn.disabled=false}
    }
  }

  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-v082-correct-data]');if(b){e.preventDefault();const op=getOp(b.getAttribute('data-v082-correct-data'));if(op)openModal(op);return}const trigger=e.target.closest?.('[onclick*="openDetail"]');if(trigger){const m=(trigger.getAttribute('onclick')||'').match(/openDetail\((['"]?)([^)'";]+)\1\)/);if(m){currentId=m[2];schedule(currentId)}}},true);
  window.addEventListener('betel:real-data-ready',()=>{applyAll(true,true);if(currentId!==null)schedule(currentId)});
  window.addEventListener('pageshow',()=>setTimeout(()=>applyAll(false,true),450));
  const wrap=()=>{if(typeof window.openDetail!=='function'||window.openDetail.__v082DataCorrectionWrapped)return;const original=window.openDetail;const fn=function(id){currentId=id;const r=original.apply(this,arguments);schedule(id);return r};fn.__v082DataCorrectionWrapped=true;window.openDetail=fn};
  installStyles();setTimeout(wrap,500);setTimeout(wrap,1200);setTimeout(()=>applyAll(false,true),1100);
})();
