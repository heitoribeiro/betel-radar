/* Betel Radar v0.8.2 — ferramentas administrativas da oportunidade, build 8212 */
(function(){
  const BUILD='8212';
  const SUPABASE_URL='https://asnjlaxhbehzhisandmz.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_JCp12LZjTSgH7mi-X-eOvg_hILh1fb3';
  let currentId=null;
  let wrapped=false;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function sourceKey(op){const s=String(op?.portalSource||op?.sourceLabel||op?.source||'').toLowerCase();return s.includes('viva')?'vivareal':s.includes('olx')?'olx':s.replace(/\s.+$/,'')}
  function getOp(id){return (Array.isArray(window.opportunities)?window.opportunities:[]).find(o=>String(o?.id)===String(id))||null}
  function deepToken(v,depth=0){if(!v||depth>4)return '';if(typeof v==='object'){if(typeof v.access_token==='string')return v.access_token;for(const k of ['currentSession','session','data','value']){const t=deepToken(v[k],depth+1);if(t)return t}}return ''}
  function accessToken(){
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';if(!/^sb-.*-auth-token$/.test(k))continue;
      try{const t=deepToken(JSON.parse(localStorage.getItem(k)||'null'));if(t)return t}catch{}
    }
    return ''
  }
  async function rpc(name,body){
    const token=accessToken();if(!token)throw new Error('Sessão do Betel Cloud não encontrada. Entre novamente em Configurações.');
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body||{})});
    const text=await r.text();if(!r.ok)throw new Error(text?(()=>{try{return JSON.parse(text)?.message||text}catch{return text}})():`HTTP ${r.status}`);
    try{return text?JSON.parse(text):null}catch{return text}
  }
  function cityCenter(city=''){
    const k=city.toLowerCase();if(k.includes('lauro'))return[-12.8944,-38.3272];if(k.includes('cama'))return[-12.6998,-38.3261];if(k.includes('mata'))return[-12.5307,-38.3009];if(k.includes('simões')||k.includes('simoes'))return[-12.7867,-38.4023];if(k.includes('dias'))return[-12.6186,-38.2926];return[-12.88,-38.31]
  }
  function normalizeManualLabels(){
    (Array.isArray(window.opportunities)?window.opportunities:[]).forEach(op=>{if(op?.geocodePrecision==='manual'||op?.geocode_precision==='manual')op.locationPrecisionLabel='Localização corrigida manualmente'})
  }

  function installStyles(){
    if(document.getElementById('v082AdminToolStyles'))return;
    const s=document.createElement('style');s.id='v082AdminToolStyles';s.textContent=`
      .v082-admin-danger{border-color:#e6c9cd!important;color:#9b2734!important;background:#fff8f8!important}
      .v082-admin-overlay{position:fixed;inset:0;z-index:1000002;background:rgba(15,15,15,.48);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
      .v082-admin-modal{width:min(620px,100%);max-height:min(88vh,760px);overflow:auto;background:#fff;border-radius:22px;padding:18px;box-shadow:0 30px 80px rgba(0,0,0,.25);font-family:inherit;color:#171717}
      .v082-admin-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.v082-admin-head h3{margin:0;font-size:20px}.v082-admin-head p{margin:4px 0 0;color:#777;font-size:12px;line-height:1.4}.v082-admin-close{border:1px solid #ddd;background:#fff;border-radius:12px;width:38px;height:38px;font-size:22px;cursor:pointer}
      .v082-admin-map{height:310px;border-radius:16px;overflow:hidden;margin:14px 0 12px;border:1px solid #ddd;background:#f4f4f4}.v082-admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v082-admin-field{border:1px solid #e3dfd8;border-radius:12px;padding:9px 10px}.v082-admin-field small{display:block;color:#888;font-size:10px}.v082-admin-field b{display:block;margin-top:3px;font-size:12px;overflow-wrap:anywhere}
      .v082-admin-note{width:100%;min-height:70px;resize:vertical;border:1px solid #ddd;border-radius:12px;padding:10px;box-sizing:border-box;font:inherit;font-size:12px;margin-top:10px}.v082-admin-ref{display:flex;gap:8px;align-items:flex-start;margin-top:10px;padding:10px;border-radius:12px;background:#fff8e7;font-size:11px;line-height:1.4}.v082-admin-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.v082-admin-actions button{border:1px solid #ddd;background:#fff;border-radius:12px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer}.v082-admin-actions .primary{background:#171717;color:#fff;border-color:#171717}.v082-admin-status{margin-top:10px;font-size:11px;color:#666;min-height:16px}
      @media(max-width:760px){.v082-admin-overlay{padding:8px;align-items:flex-end}.v082-admin-modal{border-radius:20px 20px 0 0;max-height:92vh;padding:14px}.v082-admin-map{height:280px}.v082-admin-grid{grid-template-columns:1fr}.v082-admin-actions{display:grid;grid-template-columns:1fr 1fr}.v082-admin-actions button{width:100%}}
    `;document.head.appendChild(s)
  }

  function injectTools(id=currentId){
    const op=getOp(id);if(!op||!op.sourceListing)return false;
    const panel=document.getElementById('v082SourceDetailPanel');if(!panel)return false;
    const actions=panel.querySelector('.v082-origin-actions');if(!actions)return false;
    if(!actions.querySelector('[data-v082-correct-location]')){
      const b=document.createElement('button');b.type='button';b.className='v082-origin-btn';b.setAttribute('data-v082-correct-location',String(op.id));b.textContent='📍 Corrigir localização';actions.appendChild(b)
    }
    if(!actions.querySelector('[data-v082-mark-unavailable]')){
      const b=document.createElement('button');b.type='button';b.className='v082-origin-btn v082-admin-danger';b.setAttribute('data-v082-mark-unavailable',String(op.id));b.textContent='Marcar indisponível';actions.appendChild(b)
    }
    return true
  }
  function schedule(id=currentId){[80,220,520].forEach(ms=>setTimeout(()=>injectTools(id),ms))}
  function wrapOpenDetail(){
    if(wrapped||typeof window.openDetail!=='function')return;const original=window.openDetail;
    window.openDetail=function(id){currentId=id;const r=original.apply(this,arguments);schedule(id);return r};
    Object.assign(window.openDetail,{__v082AdminWrapped:true});wrapped=true
  }

  function openCorrection(op){
    installStyles();document.querySelector('.v082-admin-overlay')?.remove();
    const start=Array.isArray(op.coords)&&op.coords.length===2?op.coords.map(Number):cityCenter(op.city);
    const canReference=!!(op.neighborhood&&op.city);
    const overlay=document.createElement('div');overlay.className='v082-admin-overlay';overlay.innerHTML=`<div class="v082-admin-modal" role="dialog" aria-modal="true"><div class="v082-admin-head"><div><h3>Corrigir localização</h3><p>Toque no mapa ou arraste o marcador para a referência correta do anúncio.</p></div><button class="v082-admin-close" type="button" aria-label="Fechar">×</button></div><div class="v082-admin-grid" style="margin-top:12px"><div class="v082-admin-field"><small>Anúncio</small><b>${esc(op.title)}</b></div><div class="v082-admin-field"><small>Referência informada</small><b>${esc([op.neighborhood,op.city].filter(Boolean).join(', ')||'Não informada')}</b></div></div><div id="v082AdminMap" class="v082-admin-map"></div><div class="v082-admin-grid"><div class="v082-admin-field"><small>Latitude</small><b id="v082AdminLat">${Number(start[0]).toFixed(6)}</b></div><div class="v082-admin-field"><small>Longitude</small><b id="v082AdminLng">${Number(start[1]).toFixed(6)}</b></div></div><textarea class="v082-admin-note" id="v082AdminNote" placeholder="Observação opcional sobre a correção"></textarea>${canReference?`<label class="v082-admin-ref"><input type="checkbox" id="v082AdminSaveRef"><span>Usar esta posição como referência do bairro/localidade <b>${esc(op.neighborhood)}</b> em anúncios futuros. Marque somente quando estiver corrigindo a referência do bairro, e não apenas a posição específica deste imóvel.</span></label>`:''}<div class="v082-admin-status" id="v082AdminStatus"></div><div class="v082-admin-actions"><button type="button" data-v082-admin-cancel>Cancelar</button><button type="button" class="primary" data-v082-admin-save>Salvar correção</button></div></div>`;
    document.body.appendChild(overlay);
    let lat=Number(start[0]),lng=Number(start[1]),map=null,marker=null;
    const update=(a,b)=>{lat=Number(a);lng=Number(b);overlay.querySelector('#v082AdminLat').textContent=lat.toFixed(6);overlay.querySelector('#v082AdminLng').textContent=lng.toFixed(6)};
    if(window.L){
      map=L.map(overlay.querySelector('#v082AdminMap'),{zoomControl:true}).setView([lat,lng],Array.isArray(op.coords)?14:11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
      marker=L.marker([lat,lng],{draggable:true}).addTo(map);marker.on('dragend',()=>{const p=marker.getLatLng();update(p.lat,p.lng)});map.on('click',e=>{marker.setLatLng(e.latlng);update(e.latlng.lat,e.latlng.lng)});setTimeout(()=>map.invalidateSize(),80)
    }else overlay.querySelector('#v082AdminMap').innerHTML='<div style="padding:18px;color:#777">Mapa interativo indisponível neste momento.</div>';
    const close=()=>{try{map?.remove()}catch{}overlay.remove()};overlay.querySelector('.v082-admin-close').onclick=close;overlay.querySelector('[data-v082-admin-cancel]').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('[data-v082-admin-save]').onclick=async()=>{
      const btn=overlay.querySelector('[data-v082-admin-save]'),status=overlay.querySelector('#v082AdminStatus');btn.disabled=true;status.textContent='Salvando correção…';
      try{
        await rpc('radar_correct_listing_location',{p_source:sourceKey(op),p_external_id:String(op.externalId||op.external_id||''),p_latitude:lat,p_longitude:lng,p_note:overlay.querySelector('#v082AdminNote').value||null,p_save_reference:!!overlay.querySelector('#v082AdminSaveRef')?.checked});
        status.textContent='Localização corrigida ✓';
        op.coords=[lat,lng];op.latitude=lat;op.longitude=lng;op.geocodePrecision='manual';op.geocodeSource='manual';op.locationPrecisionLabel='Localização corrigida manualmente';
        setTimeout(async()=>{close();try{await window.BetelRadarSync?.syncNow?.()}catch{}},500)
      }catch(err){status.textContent=`Não foi possível salvar: ${err.message||err}`;btn.disabled=false}
    }
  }

  async function markUnavailable(op){
    if(!confirm('Confirmar que este anúncio não está mais disponível ou não foi localizado no portal?\n\nEle será retirado do Radar e não voltará apenas porque continuar indexado no Brave Search.'))return;
    try{
      await rpc('radar_mark_listing_unavailable',{p_source:sourceKey(op),p_external_id:String(op.externalId||op.external_id||''),p_reason:'confirmado_pelo_usuario_ao_abrir_link'});
      alert('Anúncio marcado como indisponível. Ele será retirado das oportunidades ativas.');
      try{window.closeDetail?.()}catch{}
      try{await window.BetelRadarSync?.syncNow?.()}catch{}
    }catch(err){alert(`Não foi possível marcar o anúncio como indisponível: ${err.message||err}`)}
  }

  document.addEventListener('click',e=>{
    const correct=e.target.closest?.('[data-v082-correct-location]');if(correct){e.preventDefault();const op=getOp(correct.getAttribute('data-v082-correct-location'));if(op)openCorrection(op);return}
    const unavailable=e.target.closest?.('[data-v082-mark-unavailable]');if(unavailable){e.preventDefault();const op=getOp(unavailable.getAttribute('data-v082-mark-unavailable'));if(op)markUnavailable(op);return}
  });
  window.addEventListener('betel:real-data-ready',()=>{normalizeManualLabels();if(currentId!==null)schedule(currentId)});
  window.addEventListener('pageshow',()=>{normalizeManualLabels();setTimeout(wrapOpenDetail,200)});
  installStyles();normalizeManualLabels();setTimeout(wrapOpenDetail,250);setTimeout(()=>{if(!wrapped)wrapOpenDetail()},900);
  window.__BETEL_ADMIN_TOOLS__={build:BUILD,rpc};
})();
