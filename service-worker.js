const CACHE='betel-radar-v0.8.2-github-8245';
const ASSETS=[
  './','./index.html','./manifest.webmanifest','./icon.svg',
  './chunk00.txt','./chunk01.txt','./chunk02.txt','./chunk03.txt',
  './v080.css','./v080.js','./v081.css','./v081.js','./v081-mobile.css','./v081-mobile-fix.js','./detail-layer-fix.js',
  './v082-auth-bootstrap.js','./v082-auth-session.js','./v082-app-loader.js',
  './v082-real-data.js','./v082-sync.js','./v082-map-data-bridge.js','./v082-opportunity-detail.js','./v082-admin-tools.js','./v082-data-correction.js','./v082-prospecting.js','./v082-detail-layout-fix.js','./v082-detail-data-guard.js','./v082-ui-stability.js','./v082-dashboard-crm-authority.js','./v082-radar-cleanup.js','./v082-mobile-menu-fix.js','./v082-desktop-layout-fix.js','./v082-visual-polish.js','./v082-funnel-crm-sync.js','./v082-map-agenda-final-fix.js','./v082-agenda-today-dedup.js','./v082-contacts-hub.js','./v082-olx-official.js','./logo-br.svg'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  const noCacheFiles=[
    'index.html','v080.css','v080.js','v081-mobile-fix.js','header-fix.js','v082-auth-bootstrap.js','v082-auth-session.js','v082-app-loader.js',
    'v082-real-data.js','v082-sync.js','v082-map-data-bridge.js','v082-opportunity-detail.js','v082-admin-tools.js',
    'v082-data-correction.js','v082-prospecting.js','v082-detail-layout-fix.js','v082-detail-data-guard.js','v082-ui-stability.js',
    'v082-dashboard-crm-authority.js','v082-radar-cleanup.js','v082-mobile-menu-fix.js','v082-desktop-layout-fix.js','v082-visual-polish.js','v082-funnel-crm-sync.js','v082-map-agenda-final-fix.js','v082-agenda-today-dedup.js','v082-contacts-hub.js','v082-olx-official.js','logo-br.svg'
  ];
  if(noCacheFiles.some(file=>url.pathname.endsWith('/'+file)||url.pathname.endsWith(file))){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }

  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
  );
});