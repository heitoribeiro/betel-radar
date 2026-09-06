/* Betel Radar v0.8.1 — cabeçalho unificado build 8117 */
(function(){
  const LABELS=['Dashboard','Radar','Radar Visual','Mapa','Contatos','CRM','Agenda','Financeiro','Mensagens IA','Configurações'];
  const SUBS=[
    'Visão geral das oportunidades comerciais',
    'Pesquisa assistida e organização de oportunidades',
    'Priorize imóveis com maior necessidade de apresentação profissional',
    'Oportunidades georreferenciadas por prioridade',
    'Prospects e canais comerciais apropriados',
    'Acompanhe o funil da prospecção ao fechamento',
    'Follow-ups e retornos comerciais',
    'Propostas, contratos e receita potencial',
    'Crie abordagens personalizadas para envio manual',
    'Preferências de monitoramento e conformidade'
  ];

  function installStyles(){
    let s=document.getElementById('betelHeaderStyles');
    if(!s){s=document.createElement('style');s.id='betelHeaderStyles';document.head.appendChild(s)}
    s.textContent=`
      .betel-platform-title{letter-spacing:-.025em}
      .betel-platform-subtitle{display:block!important;color:#7a7f87!important;font-weight:500!important}
      @media(max-width:760px){
        .betel-platform-title{font-size:24px!important;line-height:1.03!important;margin:0!important}
        .betel-platform-subtitle{font-size:12px!important;line-height:1.1!important;margin-top:5px!important;white-space:nowrap!important}
        .betel-title-wrap-mobile{margin-left:-15px!important}
      }
      @media(max-width:390px){
        .betel-platform-title{font-size:23px!important}
        .betel-platform-subtitle{font-size:11.5px!important}
      }
      @media(min-width:761px){.betel-title-wrap-mobile{margin-left:0!important}}
    `;
  }

  function visible(el){
    if(!el||el.offsetParent===null)return false;
    const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;
  }

  function sectionName(){
    const active=document.querySelector('.nav-item.active');
    if(active){
      const t=active.textContent.trim().replace(/\s+/g,' ');
      const hit=LABELS.find(x=>t===x||t.endsWith(x));
      if(hit)return hit;
    }
    const candidates=[...document.querySelectorAll('h1,h2')].filter(visible);
    for(const el of candidates){const t=el.textContent.trim();if(LABELS.includes(t))return t}
    const current=document.querySelector('.betel-platform-subtitle');
    return current?.textContent?.trim()||'Dashboard';
  }

  function findTitle(section){
    const tagged=[...document.querySelectorAll('.betel-platform-title')].find(visible);
    if(tagged)return tagged;
    const candidates=[...document.querySelectorAll('h1,h2')].filter(el=>{
      if(!visible(el))return false;
      const r=el.getBoundingClientRect();
      if(r.top>320)return false;
      const t=el.textContent.trim();
      return t===section||LABELS.includes(t);
    });
    if(!candidates.length)return null;
    candidates.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
    return candidates[0];
  }

  function findSubtitle(title){
    if(!title)return null;
    let n=title.nextElementSibling;
    if(n&&(/^(P|SMALL)$/i.test(n.tagName)||SUBS.includes(n.textContent.trim())||n.classList.contains('betel-platform-subtitle')))return n;
    const parent=title.parentElement;
    if(parent){
      const c=[...parent.children].find(el=>el!==title&&(SUBS.includes(el.textContent.trim())||el.classList.contains('betel-platform-subtitle')));
      if(c)return c;
    }
    return null;
  }

  function apply(){
    installStyles();
    const section=sectionName();
    const title=findTitle(section);
    if(!title)return;
    title.classList.add('betel-platform-title');
    title.textContent='Betel Radar';
    let sub=findSubtitle(title);
    if(sub){sub.classList.add('betel-platform-subtitle');sub.textContent=section}
    else{sub=document.createElement('div');sub.className='betel-platform-subtitle';sub.textContent=section;title.insertAdjacentElement('afterend',sub)}

    const wrap=title.parentElement;
    const mobile=window.matchMedia('(max-width:760px)').matches||window.innerWidth<=760;
    if(wrap){
      wrap.classList.toggle('betel-title-wrap-mobile',mobile);
      if(mobile)wrap.style.setProperty('margin-left','-15px','important');
      else wrap.style.removeProperty('margin-left');
    }
    if(mobile){
      title.style.setProperty('margin-left','0','important');
      sub.style.setProperty('margin-left','0','important');
    }
    document.title='Betel Radar — '+section;
  }

  function schedule(){requestAnimationFrame(apply);[80,260,700,1400,2500].forEach(ms=>setTimeout(apply,ms))}
  document.addEventListener('click',schedule,true);
  window.addEventListener('pageshow',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(schedule,300);
})();
