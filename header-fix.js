/* Betel Radar v0.8.1 — cabeçalho mobile build 8118 */
(function(){
  const LABELS=['Dashboard','Radar','Radar Visual','Mapa','Contatos','CRM','Agenda','Financeiro','Mensagens IA','Configurações'];

  function visible(el){
    if(!el||el.offsetParent===null)return false;
    const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;
  }

  function smallestVisibleExact(text,maxTop=280){
    const matches=[...document.querySelectorAll('body *')].filter(el=>{
      if(!visible(el))return false;
      const r=el.getBoundingClientRect();
      if(r.top<0||r.top>maxTop||r.width>420||r.height>120)return false;
      return el.textContent.trim()===text;
    });
    if(!matches.length)return null;
    matches.sort((a,b)=>{
      const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
      return (ra.width*ra.height)-(rb.width*rb.height);
    });
    return matches[0];
  }

  function currentSection(){
    const existing=[...document.querySelectorAll('body *')].filter(el=>{
      if(!visible(el))return false;
      const r=el.getBoundingClientRect();
      return r.top>=0&&r.top<280&&LABELS.includes(el.textContent.trim())&&r.width<300&&r.height<80;
    });
    if(existing.length){
      existing.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
      return existing[0].textContent.trim();
    }
    const active=document.querySelector('.nav-item.active');
    if(active){
      const t=active.textContent.trim().replace(/\s+/g,' ');
      const hit=LABELS.find(x=>t===x||t.endsWith(x));
      if(hit)return hit;
    }
    return 'Dashboard';
  }

  function findSubtitle(title,section){
    if(!title)return null;
    const tr=title.getBoundingClientRect();
    const candidates=[...document.querySelectorAll('body *')].filter(el=>{
      if(el===title||!visible(el))return false;
      const r=el.getBoundingClientRect();
      if(r.top<tr.bottom-4||r.top>tr.bottom+55||r.width>320||r.height>60)return false;
      const t=el.textContent.trim();
      if(t!==section&&!LABELS.includes(t))return false;
      return Math.abs(r.left-tr.left)<90;
    });
    if(!candidates.length)return null;
    candidates.sort((a,b)=>{
      const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
      return (Math.abs(ra.left-tr.left)+Math.abs(ra.top-tr.bottom))-(Math.abs(rb.left-tr.left)+Math.abs(rb.top-tr.bottom));
    });
    return candidates[0];
  }

  function apply(){
    const mobile=window.matchMedia('(max-width:760px)').matches||window.innerWidth<=760;
    const title=smallestVisibleExact('Betel Radar');
    if(!title)return;
    const section=currentSection();
    const sub=findSubtitle(title,section);

    for(const el of [title,sub]){
      if(!el)continue;
      if(mobile){
        el.style.setProperty('transform','translateX(-15px)','important');
        el.style.setProperty('transform-origin','left center','important');
      }else{
        el.style.removeProperty('transform');
        el.style.removeProperty('transform-origin');
      }
    }

    title.style.setProperty('letter-spacing','-.025em','important');
    if(mobile){
      title.style.setProperty('font-size','24px','important');
      title.style.setProperty('line-height','1.03','important');
      if(sub){
        sub.style.setProperty('font-size','12px','important');
        sub.style.setProperty('line-height','1.1','important');
      }
    }
    document.title='Betel Radar — '+section;
  }

  function schedule(){requestAnimationFrame(apply);[60,180,420,900,1800].forEach(ms=>setTimeout(apply,ms))}
  document.addEventListener('click',schedule,true);
  window.addEventListener('pageshow',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  setTimeout(schedule,200);
})();
