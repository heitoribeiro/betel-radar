/* Betel Radar v0.8.2 — autenticação unificada build 8228 */
(function(){
  const BUILD='8228';
  const SUPABASE_URL='https://asnjlaxhbehzhisandmz.supabase.co';
  const PROJECT_REF='asnjlaxhbehzhisandmz';
  const PUBLISHABLE_KEY='sb_publishable_JCp12LZjTSgH7mi-X-eOvg_hILh1fb3';
  const STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const LAST_EMAIL_KEY='betel_auth_last_email';
  const DATA_CACHE_KEYS=['betel_real_data_cache_v2'];
  const nativeFetch=window.fetch.bind(window);
  let ready=false;
  let booting=false;
  let gate=null;

  function deepSession(v,depth=0){
    if(!v||depth>5)return null;
    if(typeof v==='object'&&typeof v.access_token==='string')return v;
    if(typeof v==='object')for(const k of ['currentSession','session','data','value']){const s=deepSession(v[k],depth+1);if(s)return s}
    return null;
  }
  function storageEntries(){
    const keys=[STORAGE_KEY];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(/^sb-.*-auth-token$/.test(k)&&!keys.includes(k))keys.push(k);
    }
    return keys;
  }
  function readSession(){
    for(const key of storageEntries()){
      try{const raw=localStorage.getItem(key);if(!raw)continue;const session=deepSession(JSON.parse(raw));if(session?.access_token)return {key,session}}catch{}
    }
    return null;
  }
  function accessToken(){return readSession()?.session?.access_token||''}
  function clearSession(){
    storageEntries().forEach(k=>{if(k===STORAGE_KEY||k.startsWith(`sb-${PROJECT_REF}-`))localStorage.removeItem(k)});
  }
  function clearSensitiveCache(){DATA_CACHE_KEYS.forEach(k=>localStorage.removeItem(k))}
  function normalizedSession(session){
    const out={...session};
    if(!out.expires_at&&out.expires_in)out.expires_at=Math.floor(Date.now()/1000)+Number(out.expires_in);
    return out;
  }
  function persistSession(session){
    const normalized=normalizedSession(session);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));
    if(normalized?.user?.email)localStorage.setItem(LAST_EMAIL_KEY,normalized.user.email);
    return normalized;
  }

  async function authRequest(path,options={}){
    const headers=new Headers(options.headers||{});
    headers.set('apikey',PUBLISHABLE_KEY);
    headers.set('Accept','application/json');
    if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
    const response=await nativeFetch(`${SUPABASE_URL}${path}`,{...options,headers,cache:'no-store'});
    const text=await response.text();
    let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
    if(!response.ok){
      const message=(data&&typeof data==='object'&&(data.msg||data.message||data.error_description||data.error))||`HTTP ${response.status}`;
      const err=new Error(String(message));err.status=response.status;throw err;
    }
    return data;
  }
  async function validateSession(session){
    if(!session?.access_token)return null;
    try{
      const user=await authRequest('/auth/v1/user',{headers:{Authorization:`Bearer ${session.access_token}`}});
      return user?{...session,user}:null;
    }catch(err){if(err.status===401||err.status===403)return null;throw err}
  }
  async function refreshSession(session){
    if(!session?.refresh_token)return null;
    try{
      const data=await authRequest('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
      return data?.access_token?persistSession(data):null;
    }catch{return null}
  }
  async function resolveSession(){
    const found=readSession();if(!found)return null;
    let session=found.session;
    let valid=await validateSession(session);
    if(valid){if(found.key!==STORAGE_KEY)persistSession(valid);return valid}
    session=await refreshSession(session);if(!session)return null;
    valid=await validateSession(session);return valid?persistSession(valid):null;
  }

  function installStyles(){
    if(document.getElementById('v082AuthGateStyles'))return;
    const s=document.createElement('style');s.id='v082AuthGateStyles';s.textContent=`
      .betel-auth-gate{position:fixed;inset:0;z-index:2147483000;background:linear-gradient(155deg,#f6f7f8 0%,#eceff1 100%);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;visibility:visible!important}
      .betel-auth-card{width:min(430px,100%);background:#fff;border:1px solid #e6e2dc;border-radius:26px;padding:25px;box-sizing:border-box;box-shadow:0 28px 70px rgba(0,0,0,.14)}
      .betel-auth-brand{display:flex;align-items:center;gap:13px;margin-bottom:21px}.betel-auth-logo{width:58px;height:58px;border-radius:50%;object-fit:contain;background:#111}.betel-auth-name{font-size:25px;font-weight:900;line-height:1.05}.betel-auth-sub{font-size:12px;color:#777;margin-top:5px}
      .betel-auth-title{font-size:19px;font-weight:850;margin:0 0 6px}.betel-auth-copy{font-size:12px;color:#777;line-height:1.45;margin-bottom:18px}
      .betel-auth-field{display:block;margin-top:11px}.betel-auth-field span{display:block;font-size:11px;font-weight:800;margin:0 0 6px}.betel-auth-input{width:100%;height:48px;border:1px solid #d9d5cf;border-radius:13px;padding:0 13px;box-sizing:border-box;font:inherit;font-size:14px;background:#fff;color:#171717;outline:none}.betel-auth-input:focus{border-color:#9d7449;box-shadow:0 0 0 3px rgba(157,116,73,.12)}
      .betel-auth-btn{width:100%;height:49px;margin-top:17px;border:0;border-radius:13px;background:#171717;color:#fff;font:inherit;font-weight:850;font-size:14px;cursor:pointer}.betel-auth-btn:disabled{opacity:.62;cursor:wait}
      .betel-auth-status{min-height:18px;margin-top:10px;font-size:11px;color:#777;line-height:1.35}.betel-auth-status.error{color:#a12f3e}.betel-auth-security{margin-top:17px;padding-top:14px;border-top:1px solid #eeeae4;font-size:10px;color:#858585;line-height:1.45}
      .betel-auth-checking{display:flex;align-items:center;gap:11px;padding:14px 0 4px;color:#666;font-size:12px}.betel-auth-spinner{width:22px;height:22px;border:3px solid #ddd;border-top-color:#171717;border-radius:50%;animation:betelAuthSpin .8s linear infinite}@keyframes betelAuthSpin{to{transform:rotate(360deg)}}
      @media(max-width:520px){.betel-auth-gate{align-items:flex-end;padding:0}.betel-auth-card{border-radius:25px 25px 0 0;padding:22px 20px 28px;max-height:96vh;overflow:auto}.betel-auth-name{font-size:23px}.betel-auth-logo{width:54px;height:54px}}
    `;document.head.appendChild(s)
  }
  function ensureGate(){
    installStyles();
    if(gate&&gate.isConnected)return gate;
    gate=document.createElement('div');gate.className='betel-auth-gate';gate.id='betelAuthGate';
    const mount=()=>{if(document.body&&!gate.isConnected)document.body.appendChild(gate)};
    mount();if(!document.body)document.addEventListener('DOMContentLoaded',mount,{once:true});
    return gate;
  }
  function checkingView(message='Validando sua sessão…'){
    const el=ensureGate();el.innerHTML=`<div class="betel-auth-card"><div class="betel-auth-brand"><img class="betel-auth-logo" src="./logo-br.svg" alt="Betel Radar"><div><div class="betel-auth-name">Betel Radar</div><div class="betel-auth-sub">Radar de Oportunidades</div></div></div><div class="betel-auth-checking"><span class="betel-auth-spinner"></span><span>${message}</span></div></div>`;
  }
  function friendlyError(err){
    const msg=String(err?.message||err||'').toLowerCase();
    if(msg.includes('invalid login credentials'))return 'E-mail ou senha inválidos.';
    if(msg.includes('email not confirmed'))return 'O e-mail desta conta ainda não foi confirmado.';
    if(msg.includes('rate limit'))return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    return 'Não foi possível entrar. Verifique os dados e tente novamente.';
  }
  function loginView(error=''){
    ready=false;document.documentElement.classList.remove('betel-auth-ready');
    const el=ensureGate();const last=localStorage.getItem(LAST_EMAIL_KEY)||'';
    el.innerHTML=`<div class="betel-auth-card"><div class="betel-auth-brand"><img class="betel-auth-logo" src="./logo-br.svg" alt="Betel Radar"><div><div class="betel-auth-name">Betel Radar</div><div class="betel-auth-sub">Radar de Oportunidades</div></div></div><h1 class="betel-auth-title">Acesso à plataforma</h1><div class="betel-auth-copy">Entre com sua conta do Betel Cloud. Este mesmo login libera a sincronização e o acesso aos dados da plataforma.</div><form id="betelAuthForm"><label class="betel-auth-field"><span>E-mail</span><input class="betel-auth-input" id="betelAuthEmail" type="email" autocomplete="username" inputmode="email" required value="${String(last).replace(/[&<>"']/g,'')}"></label><label class="betel-auth-field"><span>Senha</span><input class="betel-auth-input" id="betelAuthPassword" type="password" autocomplete="current-password" required></label><button class="betel-auth-btn" id="betelAuthSubmit" type="submit">Entrar</button><div class="betel-auth-status ${error?'error':''}" id="betelAuthStatus">${error}</div></form><div class="betel-auth-security">🔒 A senha é enviada diretamente ao serviço de autenticação do Betel Cloud e não é armazenada pelo Betel Radar.</div></div>`;
    const form=el.querySelector('#betelAuthForm');
    form.onsubmit=async e=>{
      e.preventDefault();const email=el.querySelector('#betelAuthEmail').value.trim();const password=el.querySelector('#betelAuthPassword').value;const btn=el.querySelector('#betelAuthSubmit'),status=el.querySelector('#betelAuthStatus');
      btn.disabled=true;btn.textContent='Entrando…';status.className='betel-auth-status';status.textContent='Autenticando no Betel Cloud…';
      try{
        const data=await authRequest('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
        if(!data?.access_token)throw new Error('Sessão não retornada pelo servidor.');
        persistSession(data);localStorage.setItem(LAST_EMAIL_KEY,email);status.textContent='Acesso autorizado. Carregando plataforma…';
        setTimeout(()=>location.reload(),180);
      }catch(err){btn.disabled=false;btn.textContent='Entrar';status.className='betel-auth-status error';status.textContent=friendlyError(err)}
    };
    setTimeout(()=>el.querySelector(last?'#betelAuthPassword':'#betelAuthEmail')?.focus(),50);
  }
  function markReady(session){
    ready=true;document.documentElement.classList.add('betel-auth-ready');gate?.remove();gate=null;
    window.dispatchEvent(new CustomEvent('betel:auth-ready',{detail:{build:BUILD,user:session?.user||null}}));
  }

  async function signOut(){
    const token=accessToken();
    if(token){try{await authRequest('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`}})}catch{}}
    clearSession();clearSensitiveCache();ready=false;document.documentElement.classList.remove('betel-auth-ready');location.reload();
  }
  async function boot(){
    if(booting)return;booting=true;checkingView();
    try{
      const session=await resolveSession();
      if(session){persistSession(session);markReady(session)}
      else{clearSession();clearSensitiveCache();loginView()}
    }catch(err){console.warn('Betel Radar: falha ao validar autenticação',err);loginView('Não foi possível validar a sessão. Tente entrar novamente.')}
    finally{booting=false}
  }

  // Todo acesso ao banco do Betel Cloud passa a usar a mesma sessão autenticada.
  window.fetch=async function(input,init={}){
    let url='';try{url=typeof input==='string'?input:input instanceof URL?input.href:input?.url||''}catch{}
    if(url.startsWith(SUPABASE_URL)&&!url.includes('/auth/v1/')){
      const token=accessToken();
      if(!token)throw new Error('Sessão do Betel Radar necessária para acessar o Betel Cloud.');
      const headers=new Headers(input instanceof Request?input.headers:undefined);
      new Headers(init.headers||{}).forEach((v,k)=>headers.set(k,v));
      headers.set('apikey',PUBLISHABLE_KEY);headers.set('Authorization',`Bearer ${token}`);
      return nativeFetch(input,{...init,headers});
    }
    return nativeFetch(input,init);
  };

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!b)return;
    if((b.textContent||'').trim().toLowerCase()==='sair')setTimeout(()=>{if(!accessToken()){clearSensitiveCache();location.reload()}},500);
  },true);
  window.addEventListener('storage',e=>{if(e.key&&/^sb-.*-auth-token$/.test(e.key)){if(!e.newValue&&ready){clearSensitiveCache();location.reload()}else if(e.newValue&&!ready)boot()}});
  window.addEventListener('pageshow',()=>{if(!ready)boot()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready&&!accessToken()){clearSensitiveCache();location.reload()}});
  setInterval(()=>{if(ready&&!accessToken()){clearSensitiveCache();location.reload()}},2500);

  window.BetelRadarAuth={build:BUILD,getSession:()=>readSession()?.session||null,getAccessToken:accessToken,signOut,requireAuth:boot};
  boot();
})();
