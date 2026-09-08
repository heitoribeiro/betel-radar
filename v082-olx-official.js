/* Betel Radar v0.8.2 — integração oficial OLX, build 8245 */
(function(){
  'use strict';

  const BUILD='8245';
  const START_URL='https://asnjlaxhbehzhisandmz.supabase.co/functions/v1/olx-oauth-callback?action=start';
  const DOC_URL='https://developers.olx.com.br/anuncio/api/oauth.html';
  let loading=false;
  let statusRows=[];

  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();

  function accessToken(){
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!/^sb-.*-auth-token$/.test(key))continue;
      try{
        const value=JSON.parse(localStorage.getItem(key)||'null');
        const walk=(v,depth=0)=>{
          if(!v||depth>5)return '';
          if(typeof v==='object'&&typeof v.access_token==='string')return v.access_token;
          if(typeof v==='object')for(const k of ['currentSession','session','data','value']){const found=walk(v[k],depth+1);if(found)return found}
          return '';
        };
        const token=walk(value);if(token)return token;
      }catch{}
    }
    return '';
  }

  function installStyles(){
    if(document.getElementById('v082OlxOfficialStyles'))return;
    const s=document.createElement('style');
    s.id='v082OlxOfficialStyles';
    s.textContent=`
      #v082OlxOfficialPanel{margin:16px 0 22px;padding:0;border:1px solid #e4e0d9;border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 10px 30px rgba(20,20,20,.045);color:#171717;box-sizing:border-box}
      .v082-olx-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:16px 17px;border-bottom:1px solid #ece8e1;background:linear-gradient(90deg,#fbfaf7,#fff)}
      .v082-olx-title{font-size:16px;font-weight:900;line-height:1.2}.v082-olx-sub{font-size:10px;color:#777;line-height:1.45;margin-top:4px;max-width:620px}
      .v082-olx-badge{display:inline-flex;align-items:center;padding:6px 9px;border-radius:999px;background:#e8f7ef;color:#177a52;font-size:9px;font-weight:850;white-space:nowrap}
      .v082-olx-body{padding:14px 16px 16px}.v082-olx-note{padding:10px 11px;border-radius:13px;background:#fff8e7;color:#715a27;font-size:10px;line-height:1.45}
      .v082-olx-status{display:grid;gap:8px;margin-top:12px}.v082-olx-account{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #e9e5df;border-radius:14px;padding:11px 12px;background:#fff}.v082-olx-account strong{display:block;font-size:12px}.v082-olx-account small{display:block;color:#777;font-size:9px;line-height:1.4;margin-top:3px}.v082-olx-state{padding:5px 7px;border-radius:999px;background:#e8f7ef;color:#177a52;font-size:9px;font-weight:850;white-space:nowrap}
      .v082-olx-empty{padding:14px;border:1px dashed #ddd7ce;border-radius:14px;background:#faf9f6;text-align:center;font-size:10px;color:#666;line-height:1.5;margin-top:12px}.v082-olx-empty b{display:block;color:#222;font-size:12px;margin-bottom:3px}
      .v082-olx-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v082-olx-btn{appearance:none;border:1px solid #dcd7d0;background:#fff;color:#171717;border-radius:11px;padding:9px 11px;font:inherit;font-size:10px;font-weight:850;cursor:pointer;text-decoration:none}.v082-olx-btn.primary{background:#171717;border-color:#171717;color:#fff}.v082-olx-btn:disabled{opacity:.55;cursor:wait}
      .v082-olx-feedback{margin-top:9px;font-size:10px;line-height:1.4;color:#666;min-height:14px}.v082-olx-feedback.ok{color:#177a52}.v082-olx-feedback.err{color:#9b2734}
      @media(max-width:760px){#v082OlxOfficialPanel{border-radius:17px;margin:14px 0 18px}.v082-olx-head{display:block;padding:13px 14px}.v082-olx-badge{margin-top:8px}.v082-olx-body{padding:12px}.v082-olx-account{grid-template-columns:1fr}.v082-olx-state{width:max-content}.v082-olx-actions{display:grid;grid-template-columns:1fr}.v082-olx-btn{text-align:center;width:100%;box-sizing:border-box}}
    `;
    document.head.appendChild(s);
  }

  function configRoot(){return document.getElementById('configView')||null}

  function fmtDate(v){
    if(!v)return '';
    const d=new Date(v);if(Number.isNaN(d.getTime()))return '';
    return d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  }

  function feedback(text='',kind=''){
    const el=document.getElementById('v082OlxFeedback');
    if(!el)return;
    el.textContent=text;el.className='v082-olx-feedback'+(kind?' '+kind:'');
  }

  function panel(){
    const root=configRoot();if(!root)return null;
    let el=document.getElementById('v082OlxOfficialPanel');
    if(!el){el=document.createElement('section');el.id='v082OlxOfficialPanel';root.appendChild(el)}
    return el;
  }

  function render(){
    const el=panel();if(!el)return false;
    const active=statusRows.filter(r=>String(r?.status||'')==='active');
    el.innerHTML=`
      <div class="v082-olx-head"><div><div class="v082-olx-title">OLX Oficial</div><div class="v082-olx-sub">Integração homologada pela OLX para autenticação de clientes em comum e gerenciamento dos anúncios vinculados ao software.</div></div><span class="v082-olx-badge">✓ Aplicação homologada</span></div>
      <div class="v082-olx-body">
        <div class="v082-olx-note"><b>Escopo separado do Radar:</b> esta integração oficial não faz busca geral no marketplace. Ela será usada somente para contas OLX que autorizarem o Betel Radar e para os recursos permitidos pela API oficial.</div>
        <div class="v082-olx-status">${active.length?active.map(r=>`<div class="v082-olx-account"><div><strong>${esc(r.olx_user_name||r.olx_user_email||'Conta OLX conectada')}</strong><small>${r.olx_user_email?esc(r.olx_user_email)+' · ':''}escopos: ${esc(r.scope||'não informado')}${r.connected_at?' · conectada em '+esc(fmtDate(r.connected_at)):''}</small></div><span class="v082-olx-state">Conectada</span></div>`).join(''):`<div class="v082-olx-empty"><b>Nenhuma conta OLX conectada</b>Use o botão abaixo para autenticar uma conta de cliente em comum pelo fluxo oficial OAuth da OLX.</div>`}</div>
        <div class="v082-olx-actions"><button type="button" class="v082-olx-btn primary" id="v082OlxConnect">${active.length?'Conectar outra conta OLX':'Conectar conta OLX'}</button><button type="button" class="v082-olx-btn" id="v082OlxRefresh">Atualizar status</button><a class="v082-olx-btn" href="${DOC_URL}" target="_blank" rel="noopener noreferrer">Documentação OLX ↗</a></div>
        <div id="v082OlxFeedback" class="v082-olx-feedback"></div>
      </div>`;
    el.dataset.build=BUILD;
    return true;
  }

  async function loadStatus(){
    if(loading)return;
    const root=configRoot();if(!root)return;
    loading=true;
    try{
      if(!window.__BETEL_ADMIN_TOOLS__?.rpc)throw new Error('Sessão administrativa ainda não carregada.');
      const rows=await window.__BETEL_ADMIN_TOOLS__.rpc('radar_olx_status',{});
      statusRows=Array.isArray(rows)?rows:[];
      render();
    }catch(err){
      render();feedback(`Não foi possível consultar a integração OLX: ${err?.message||err}`,'err');
    }finally{loading=false}
  }

  async function startOAuth(){
    const btn=document.getElementById('v082OlxConnect');
    const token=accessToken();
    if(!token){feedback('Sessão do Betel Cloud não encontrada. Entre novamente e tente de novo.','err');return}
    if(btn)btn.disabled=true;feedback('Preparando autenticação segura com a OLX…');
    try{
      const response=await fetch(START_URL,{method:'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.authorization_url)throw new Error(data.error||`HTTP ${response.status}`);
      location.assign(data.authorization_url);
    }catch(err){
      feedback(`Não foi possível iniciar a autenticação OLX: ${err?.message||err}`,'err');if(btn)btn.disabled=false;
    }
  }

  function consumeReturnFlag(){
    const u=new URL(location.href);const state=u.searchParams.get('olx');
    if(!state)return;
    const reason=u.searchParams.get('olx_reason')||'';
    setTimeout(()=>{
      if(state==='connected'){feedback('Conta OLX conectada com sucesso pelo fluxo oficial.','ok');loadStatus()}
      else feedback(`A autenticação OLX não foi concluída${reason?': '+reason:''}.`,'err');
    },700);
    u.searchParams.delete('olx');u.searchParams.delete('olx_reason');
    history.replaceState({},'',u.pathname+(u.search?u.search:'')+u.hash);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#v082OlxConnect')){e.preventDefault();startOAuth();return}
    if(e.target.closest?.('#v082OlxRefresh')){e.preventDefault();loadStatus();return}
    const nav=e.target.closest?.('.nav-item,[data-view],[data-section],[onclick*="showSection"],[onclick*="navigate"]');
    if(nav){const t=norm(nav.textContent).toLowerCase(),v=norm(nav.getAttribute?.('data-view')).toLowerCase();if(t.includes('configura')||v.includes('config')){setTimeout(()=>{render();loadStatus()},160)}}
  },true);

  window.addEventListener('pageshow',()=>{setTimeout(()=>{if(configRoot()){render();loadStatus();consumeReturnFlag()}},500)});
  window.addEventListener('focus',()=>{if(configRoot())setTimeout(loadStatus,180)});

  function start(){
    if(!document.body){setTimeout(start,50);return}
    installStyles();
    setTimeout(()=>{if(configRoot()){render();loadStatus();consumeReturnFlag()}},900);
  }

  start();
  window.__BETEL_OLX_OFFICIAL__={build:BUILD,refresh:loadStatus};
})();
