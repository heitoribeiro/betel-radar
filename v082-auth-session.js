/* Betel Radar v0.8.2 — sessão autenticada estável, build 8231 */
(function(){
  'use strict';
  const BUILD='8231';
  const SUPABASE_URL='https://asnjlaxhbehzhisandmz.supabase.co';
  const PROJECT_REF='asnjlaxhbehzhisandmz';
  const PUBLISHABLE_KEY='sb_publishable_JCp12LZjTSgH7mi-X-eOvg_hILh1fb3';
  const STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
  const CACHE_KEYS=['betel_real_data_cache_v2'];
  const nativeFetch=window.fetch.bind(window);
  let redirecting=false;

  function deepSession(v,depth=0){
    if(!v||depth>5)return null;
    if(typeof v==='object'&&typeof v.access_token==='string')return v;
    if(typeof v==='object')for(const k of ['currentSession','session','data','value']){const s=deepSession(v[k],depth+1);if(s)return s}
    return null;
  }
  function readSession(){
    try{const raw=localStorage.getItem(STORAGE_KEY);return raw?deepSession(JSON.parse(raw)):null}catch{return null}
  }
  function token(){return readSession()?.access_token||''}
  function clearSensitive(){CACHE_KEYS.forEach(k=>localStorage.removeItem(k))}
  function clearSession(){localStorage.removeItem(STORAGE_KEY);clearSensitive()}
  function goLogin(){
    if(redirecting)return;redirecting=true;clearSession();
    const base=new URL('./',window.location.href);base.search='login=1';
    location.replace(base.href);
  }
  function usable(session){
    if(!session?.access_token)return false;
    const exp=Number(session.expires_at||0);
    if(exp&&exp<=Math.floor(Date.now()/1000)+15)return false;
    return true;
  }

  const session=readSession();
  if(!usable(session)){goLogin();return}

  window.fetch=async function(input,init={}){
    let url='';try{url=typeof input==='string'?input:input instanceof URL?input.href:input?.url||''}catch{}
    if(url.startsWith(SUPABASE_URL)&&!url.includes('/auth/v1/')){
      const current=readSession();
      if(!usable(current)){goLogin();throw new Error('Sessão expirada.')}
      const headers=new Headers(input instanceof Request?input.headers:undefined);
      new Headers(init.headers||{}).forEach((v,k)=>headers.set(k,v));
      headers.set('apikey',PUBLISHABLE_KEY);
      headers.set('Authorization',`Bearer ${current.access_token}`);
      const response=await nativeFetch(input,{...init,headers});
      if(response.status===401||response.status===403)setTimeout(goLogin,0);
      return response;
    }
    return nativeFetch(input,init);
  };

  async function signOut(){
    const current=readSession();
    if(current?.access_token){
      try{await nativeFetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${current.access_token}`},cache:'no-store'})}catch{}
    }
    goLogin();
  }

  document.documentElement.classList.add('betel-auth-ready');
  window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY&&!e.newValue)goLogin()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!usable(readSession()))goLogin()});
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!b)return;
    if((b.textContent||'').trim().toLowerCase()==='sair'){
      e.preventDefault();e.stopPropagation();signOut();
    }
  },true);
  window.BetelRadarAuth={build:BUILD,getSession:readSession,getAccessToken:token,signOut,requireAuth:()=>Promise.resolve(readSession())};
  window.dispatchEvent(new CustomEvent('betel:auth-ready',{detail:{build:BUILD,user:session?.user||null}}));
})();