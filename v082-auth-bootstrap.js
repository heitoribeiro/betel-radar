/* Betel Radar v0.8.2 — bootstrap de autenticação antes da aplicação, build 8230 */
(function(){
  'use strict';
  const BUILD='8230';
  const SUPABASE_URL='https://asnjlaxhbehzhisandmz.supabase.co';
  const PROJECT_REF='asnjlaxhbehzhisandmz';
  const PUBLISHABLE_KEY='sb_publishable_JCp12LZjTSgH7mi-X-eOvg_hILh1fb3';
  const STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const LAST_EMAIL_KEY='betel_auth_last_email';
  let pending=null;

  function deepSession(v,depth=0){
    if(!v||depth>5)return null;
    if(typeof v==='object'&&typeof v.access_token==='string')return v;
    if(typeof v==='object'){
      for(const k of ['currentSession','session','data','value']){
        const s=deepSession(v[k],depth+1);if(s)return s;
      }
    }
    return null;
  }
  function readSession(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return null;
      return deepSession(JSON.parse(raw));
    }catch{return null}
  }
  function normalizeSession(session){
    const out={...session};
    if(!out.expires_at&&out.expires_in)out.expires_at=Math.floor(Date.now()/1000)+Number(out.expires_in);
    return out;
  }
  function persistSession(session){
    const out=normalizeSession(session);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(out));
    if(out?.user?.email)localStorage.setItem(LAST_EMAIL_KEY,out.user.email);
    return out;
  }
  function clearSession(){localStorage.removeItem(STORAGE_KEY)}

  async function request(path,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const headers=new Headers(options.headers||{});
      headers.set('apikey',PUBLISHABLE_KEY);
      headers.set('Accept','application/json');
      if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
      const response=await fetch(`${SUPABASE_URL}${path}`,{...options,headers,cache:'no-store',signal:controller.signal});
      const text=await response.text();
      let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
      if(!response.ok){
        const msg=(data&&typeof data==='object'&&(data.msg||data.message||data.error_description||data.error))||`HTTP ${response.status}`;
        const err=new Error(String(msg));err.status=response.status;throw err;
      }
      return data;
    }finally{clearTimeout(timer)}
  }
  async function validate(session){
    if(!session?.access_token)return null;
    try{
      const user=await request('/auth/v1/user',{headers:{Authorization:`Bearer ${session.access_token}`}});
      return user?persistSession({...session,user}):null;
    }catch(err){
      if(err?.status===401||err?.status===403)return null;
      throw err;
    }
  }
  async function refresh(session){
    if(!session?.refresh_token)return null;
    try{
      const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
      return data?.access_token?persistSession(data):null;
    }catch{return null}
  }
  async function existingSession(){
    let session=readSession();
    if(!session)return null;
    let valid=await validate(session);
    if(valid)return valid;
    session=await refresh(session);
    if(!session){clearSession();return null}
    valid=await validate(session);
    if(!valid)clearSession();
    return valid;
  }

  function escapeAttr(value){return String(value||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function shell(){
    document.body.innerHTML=`<main class="betel-boot-auth" id="betelBootAuth"><section class="betel-boot-card"><div class="betel-boot-brand"><img src="./logo-br.svg?v=8230" alt="Betel Radar"><div><strong>Betel Radar</strong><span>Radar de Oportunidades</span></div></div><div id="betelBootContent"></div></section></main>`;
  }
  function styles(){
    if(document.getElementById('betelBootStyle'))return;
    const s=document.createElement('style');s.id='betelBootStyle';s.textContent=`
      html,body{margin:0;min-height:100%;background:#eef0f2!important;color:#171717!important;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
      body{min-height:100vh!important;display:block!important}
      .betel-boot-auth{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;background:linear-gradient(155deg,#f6f7f8 0%,#e9ecef 100%)}
      .betel-boot-card{width:min(430px,100%);background:#fff;border:1px solid #e4e1dc;border-radius:26px;padding:25px;box-sizing:border-box;box-shadow:0 28px 70px rgba(0,0,0,.14)}
      .betel-boot-brand{display:flex;align-items:center;gap:13px;margin-bottom:21px}.betel-boot-brand img{width:58px;height:58px;border-radius:50%;object-fit:contain;background:#111}.betel-boot-brand strong{display:block;font-size:25px;line-height:1.05;font-weight:900}.betel-boot-brand span{display:block;margin-top:5px;font-size:12px;color:#777}
      .betel-boot-title{font-size:20px;font-weight:850;margin:0 0 7px}.betel-boot-copy{font-size:13px;color:#73777d;line-height:1.5;margin:0 0 18px}.betel-boot-field{display:block;margin-top:12px}.betel-boot-field span{display:block;font-size:12px;font-weight:800;margin-bottom:6px}.betel-boot-input{width:100%;height:49px;border:1px solid #d8d5d0;border-radius:13px;padding:0 13px;box-sizing:border-box;font:inherit;font-size:15px;background:#fff;color:#171717;outline:none}.betel-boot-input:focus{border-color:#9d7449;box-shadow:0 0 0 3px rgba(157,116,73,.12)}
      .betel-boot-btn{width:100%;height:49px;margin-top:17px;border:0;border-radius:13px;background:#171717;color:#fff;font:inherit;font-weight:850;font-size:15px;cursor:pointer}.betel-boot-btn:disabled{opacity:.62;cursor:wait}.betel-boot-status{min-height:19px;margin-top:10px;font-size:12px;color:#73777d;line-height:1.4}.betel-boot-status.error{color:#a12f3e}.betel-boot-security{margin-top:16px;padding-top:14px;border-top:1px solid #eeeae4;font-size:11px;color:#858585;line-height:1.45}
      .betel-boot-check{display:flex;align-items:center;gap:12px;padding:15px 0 5px;color:#666;font-size:13px}.betel-boot-spin{width:22px;height:22px;border:3px solid #ddd;border-top-color:#171717;border-radius:50%;animation:betelBootSpin .8s linear infinite}@keyframes betelBootSpin{to{transform:rotate(360deg)}}
      @media(max-width:520px){.betel-boot-auth{align-items:flex-end;padding:0}.betel-boot-card{border-radius:25px 25px 0 0;padding:22px 20px 28px;max-height:96vh;overflow:auto}.betel-boot-brand strong{font-size:23px}.betel-boot-brand img{width:54px;height:54px}}
    `;document.head.appendChild(s);
  }
  function content(){return document.getElementById('betelBootContent')}
  function checking(message='Verificando acesso…'){
    styles();if(!document.getElementById('betelBootAuth'))shell();
    content().innerHTML=`<div class="betel-boot-check"><span class="betel-boot-spin"></span><span>${message}</span></div>`;
  }
  function friendly(err){
    const msg=String(err?.message||err||'').toLowerCase();
    if(msg.includes('invalid login credentials'))return 'E-mail ou senha inválidos.';
    if(msg.includes('email not confirmed'))return 'O e-mail desta conta ainda não foi confirmado.';
    if(msg.includes('abort'))return 'A conexão demorou além do esperado. Tente novamente.';
    if(msg.includes('failed to fetch')||msg.includes('network'))return 'Não foi possível conectar ao Betel Cloud. Verifique sua conexão e tente novamente.';
    return 'Não foi possível autenticar. Verifique os dados e tente novamente.';
  }
  function login(resolve,reject,error=''){
    styles();if(!document.getElementById('betelBootAuth'))shell();
    const last=localStorage.getItem(LAST_EMAIL_KEY)||'';
    content().innerHTML=`<h1 class="betel-boot-title">Acesso à plataforma</h1><p class="betel-boot-copy">Entre com sua conta do Betel Cloud. O acesso aos dados e a sincronização usam esta mesma sessão.</p><form id="betelBootForm"><label class="betel-boot-field"><span>E-mail</span><input class="betel-boot-input" id="betelBootEmail" type="email" autocomplete="username" inputmode="email" required value="${escapeAttr(last)}"></label><label class="betel-boot-field"><span>Senha</span><input class="betel-boot-input" id="betelBootPassword" type="password" autocomplete="current-password" required></label><button class="betel-boot-btn" id="betelBootSubmit" type="submit">Entrar</button><div class="betel-boot-status ${error?'error':''}" id="betelBootStatus">${error}</div></form><div class="betel-boot-security">🔒 O Betel Radar não armazena sua senha. A autenticação é feita diretamente pelo Betel Cloud.</div>`;
    const form=document.getElementById('betelBootForm');
    form.onsubmit=async e=>{
      e.preventDefault();
      const email=document.getElementById('betelBootEmail').value.trim();
      const password=document.getElementById('betelBootPassword').value;
      const button=document.getElementById('betelBootSubmit');
      const status=document.getElementById('betelBootStatus');
      button.disabled=true;button.textContent='Entrando…';status.className='betel-boot-status';status.textContent='Autenticando no Betel Cloud…';
      try{
        const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
        if(!data?.access_token)throw new Error('Sessão não retornada.');
        const session=persistSession(data);localStorage.setItem(LAST_EMAIL_KEY,email);
        status.textContent='Acesso autorizado. Carregando plataforma…';
        resolve(session);
      }catch(err){
        button.disabled=false;button.textContent='Entrar';status.className='betel-boot-status error';status.textContent=friendly(err);
      }
    };
    setTimeout(()=>document.getElementById(last?'betelBootPassword':'betelBootEmail')?.focus(),50);
  }

  function authorize(){
    if(pending)return pending;
    pending=new Promise(async (resolve,reject)=>{
      checking();
      try{
        const session=await existingSession();
        if(session){resolve(session);return}
        login(resolve,reject);
      }catch(err){
        clearSession();login(resolve,reject,friendly(err));
      }
    });
    return pending;
  }

  window.BetelAuthBootstrap={build:BUILD,authorize,getSession:readSession};
})();
