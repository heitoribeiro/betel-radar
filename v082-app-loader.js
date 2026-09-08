/* Betel Radar v0.8.2 — carregador pós-login estável, build 8241 */
(function(){
  'use strict';

  const BUILD='8241';
  const PROJECT_REF='asnjlaxhbehzhisandmz';
  const STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;

  function deepSession(value, depth=0){
    if(!value || depth>5) return null;
    if(typeof value==='object' && typeof value.access_token==='string') return value;
    if(typeof value==='object'){
      for(const key of ['currentSession','session','data','value']){
        const found=deepSession(value[key], depth+1);
        if(found) return found;
      }
    }
    return null;
  }

  function readSession(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      return raw ? deepSession(JSON.parse(raw)) : null;
    }catch{
      return null;
    }
  }

  function usable(session){
    if(!session?.access_token) return false;
    const expiresAt=Number(session.expires_at||0);
    return !expiresAt || expiresAt > Math.floor(Date.now()/1000)+20;
  }

  async function loadApplication(){
    let packed='';
    for(const file of ['chunk00.txt','chunk01.txt','chunk02.txt','chunk03.txt']){
      packed += await (await fetch(file,{cache:'no-store'})).text();
    }

    const bytes=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
    const ds=new DecompressionStream('gzip');
    let html=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();

    html=html
      .replaceAll("window.location.origin+'/'","new URL('./',window.location.href).href")
      .replace("navigator.serviceWorker.register('/service-worker.js')","navigator.serviceWorker.register('./service-worker.js?v=8241')")
      .replace("navigator.serviceWorker.register('./service-worker.js')","navigator.serviceWorker.register('./service-worker.js?v=8241')");

    const sessionScript='<scr'+'ipt src="./v082-auth-session.js?v=8232&nocache=1"></scr'+'ipt>';
    const cssTag=sessionScript+
      '<link rel="stylesheet" href="./v080.css?v=8008&nocache=1">'+
      '<link rel="stylesheet" href="./v081.css?v=8103">'+
      '<link rel="stylesheet" href="./v081-mobile.css?v=8104">';

    const patchTag=
      '<scr'+'ipt src="./v080.js?v=8211&nocache=2"></scr'+'ipt>'+
      '<scr'+'ipt src="./v081.js?v=8108"></scr'+'ipt>'+
      '<scr'+'ipt src="./v081-mobile-fix.js?v=8213&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./detail-layer-fix.js?v=8110"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-real-data.js?v=8223&nocache=7"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-sync.js?v=8212&nocache=10"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-map-data-bridge.js?v=8211&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-opportunity-detail.js?v=8216&nocache=5"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-admin-tools.js?v=8212&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-data-correction.js?v=8214&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-prospecting.js?v=8222&nocache=3"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-detail-layout-fix.js?v=8220&nocache=4"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-detail-data-guard.js?v=8222&nocache=2"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-ui-stability.js?v=8224&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-dashboard-crm-authority.js?v=8226&nocache=2"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-radar-cleanup.js?v=8227&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-mobile-menu-fix.js?v=8235&nocache=2"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-desktop-layout-fix.js?v=8238&nocache=3"></scr'+'ipt>'+
      '<scr'+'ipt src="./header-fix.js?v=8124&nocache=8"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-visual-polish.js?v=8239&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-funnel-crm-sync.js?v=8240&nocache=1"></scr'+'ipt>'+
      '<scr'+'ipt src="./v082-map-agenda-final-fix.js?v=8241&nocache=1"></scr'+'ipt>';

    const lowerHtml=html.toLowerCase();
    const headPos=lowerHtml.indexOf('</head>');
    if(headPos<0) throw new Error('Estrutura HTML inválida: </head> não encontrado.');
    html=html.slice(0,headPos)+cssTag+html.slice(headPos);

    const bodyPos=html.toLowerCase().lastIndexOf('</body>');
    if(bodyPos<0) throw new Error('Estrutura HTML inválida: </body> não encontrado.');
    html=html.slice(0,bodyPos)+patchTag+html.slice(bodyPos);

    document.open();
    document.write(html);
    document.close();
  }

  async function boot(){
    try{
      if(!usable(readSession())){
        if(!window.BetelAuthBootstrap?.authorize) throw new Error('Módulo de autenticação não carregado.');
        await window.BetelAuthBootstrap.authorize();
        const clean=new URL('./',window.location.href);
        clean.search=`v=${BUILD}`;
        location.replace(clean.href);
        return;
      }
      await loadApplication();
    }catch(error){
      document.body.innerHTML='<div class="box"><h2>Falha ao carregar</h2><p id="loadError"></p></div>';
      const target=document.getElementById('loadError');
      if(target) target.textContent=String(error);
    }
  }

  boot();
})();