/* Betel Radar v0.8.2 — refinamento visual para desktop estreito/desktop-site, build 8239 */
(function(){
  'use strict';

  const BUILD='8239';
  const COMPACT_MAX=790;
  let scheduled=false;

  function installStyles(){
    if(document.getElementById('v082VisualPolishStyles'))return;
    const s=document.createElement('style');
    s.id='v082VisualPolishStyles';
    s.textContent=`
      /* Agenda/Financeiro: a estrutura interna foi desenhada em blocos verticais.
         Evita que o CSS legado transforme cabeçalho, KPIs e ações em itens flex comprimidos. */
      #agendaProductivity.v081-agenda-box,
      #financeProductivity.v081-fin-box{
        display:block!important;
        align-items:initial!important;
        justify-content:initial!important;
        gap:0!important;
        flex-wrap:initial!important;
        width:100%!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }
      #agendaProductivity .v081-head,
      #agendaProductivity .v081-kpis,
      #agendaProductivity .v081-actions,
      #financeProductivity .v081-head,
      #financeProductivity .v081-fin-main{
        width:100%!important;
        max-width:100%!important;
        box-sizing:border-box!important;
        flex:none!important;
      }
      #agendaProductivity .v081-kpis{
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
      }
      #agendaProductivity .v081-kpi{
        min-width:0!important;
      }

      /* Desktop estreito: aplica-se quando a barra lateral deixa menos de ~790px úteis
         para o conteúdo. É o cenário típico de "Site para computador" em celulares. */
      body.betel-compact-desktop #v082SyncCard.v082-dashboard{
        display:none!important;
      }
      body.betel-compact-desktop .kanban{
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:10px!important;
        overflow-x:visible!important;
        padding-bottom:0!important;
        align-items:stretch!important;
      }
      body.betel-compact-desktop .kanban-col{
        min-width:0!important;
        width:auto!important;
        max-width:none!important;
        min-height:178px!important;
        box-sizing:border-box!important;
      }
      body.betel-compact-desktop .kanban-col h3{
        white-space:normal!important;
        overflow-wrap:anywhere!important;
        line-height:1.2!important;
      }
      body.betel-compact-desktop .kanban-card{
        min-width:0!important;
        overflow-wrap:anywhere!important;
      }
      body.betel-compact-desktop #opportunityMap.map-shell.real-map,
      body.betel-compact-desktop .map-shell.real-map{
        height:400px!important;
        min-height:400px!important;
        border-radius:16px!important;
      }
      body.betel-compact-desktop #betelMapGeoNote{
        margin-top:10px!important;
        line-height:1.45!important;
      }
      body.betel-compact-desktop #agendaProductivity .v081-head{
        padding:13px 15px!important;
      }
      body.betel-compact-desktop #agendaProductivity .v081-kpis{
        gap:9px!important;
        padding:13px!important;
      }
      body.betel-compact-desktop #agendaProductivity .v081-kpi{
        min-height:82px!important;
        padding:11px 12px!important;
      }
      body.betel-compact-desktop #agendaProductivity .v081-kpi span{
        font-size:11px!important;
        line-height:1.2!important;
        white-space:normal!important;
      }
      body.betel-compact-desktop #agendaProductivity .v081-kpi b{
        font-size:24px!important;
      }
      body.betel-compact-desktop #agendaProductivity .v081-kpi small{
        font-size:10px!important;
        line-height:1.25!important;
      }
      body.betel-compact-desktop #agendaProductivity .v081-actions{
        padding:0 13px 13px!important;
      }

      /* Fallback para navegadores que informam viewport desktop de aproximadamente 980px. */
      @media (min-width:761px) and (max-width:1100px){
        #v082SyncCard.v082-dashboard{display:none!important}
        .kanban{grid-template-columns:repeat(4,minmax(0,1fr))!important;overflow-x:visible!important;padding-bottom:0!important}
        .kanban-col{min-width:0!important;width:auto!important;max-width:none!important}
        #opportunityMap.map-shell.real-map,.map-shell.real-map{height:400px!important;min-height:400px!important}
      }

      /* Em uma faixa ainda mais estreita, usa 2 colunas no CRM para não esmagar textos. */
      @media (min-width:761px) and (max-width:860px){
        .kanban{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
    `;
    document.head.appendChild(s);
  }

  function sidebarWidth(){
    const side=document.querySelector('.sidebar');
    if(!side)return 0;
    const cs=getComputedStyle(side);
    if(cs.display==='none'||cs.visibility==='hidden')return 0;
    const r=side.getBoundingClientRect();
    return Math.max(0,Math.min(window.innerWidth,r.width));
  }

  function updateMode(){
    scheduled=false;
    if(!document.body)return;
    const desktop=window.innerWidth>760;
    const available=Math.max(0,window.innerWidth-sidebarWidth());
    const compact=desktop&&available>0&&available<COMPACT_MAX;
    document.body.classList.toggle('betel-compact-desktop',compact);
    document.body.dataset.betelVisualPolish=BUILD;
  }

  function schedule(delay=0){
    if(delay){setTimeout(()=>schedule(),delay);return}
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(updateMode);
  }

  function refresh(){
    installStyles();
    schedule();
    schedule(100);
    schedule(320);
  }

  window.addEventListener('resize',refresh,{passive:true});
  window.addEventListener('orientationchange',()=>schedule(120),{passive:true});
  window.addEventListener('pageshow',refresh);
  window.addEventListener('betel:real-data-ready',refresh);
  window.addEventListener('betel:opportunities-synced',refresh);
  document.addEventListener('click',()=>{schedule(40);schedule(180)},true);

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&(m.attributeName==='class'||m.attributeName==='style'))))schedule(40);
  });

  function start(){
    if(!document.body){setTimeout(start,40);return}
    installStyles();
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    refresh();
    schedule(700);
  }

  start();
  window.__BETEL_VISUAL_POLISH__={build:BUILD,refresh};
})();
