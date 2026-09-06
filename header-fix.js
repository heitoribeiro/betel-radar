/* Betel Radar v0.8.1 — cabeçalho mobile build 8124 */
(function(){
  const LABELS=['Dashboard','Radar','Radar Visual','Mapa','Contatos','CRM','Agenda','Financeiro','Mensagens IA','Configurações'];

  function visible(el){
    if(!el||el.offsetParent===null)return false;
    const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;
  }

  function currentSection(){
    const active=document.querySelector('.nav-item.active');
    if(active){
      const t=active.textContent.trim().replace(/\s+/g,' ');
      const hit=LABELS.find(x=>t===x||t.endsWith(x));
      if(hit)return hit;
    }
    const tagged=document.querySelector('.betel-mobile-subtitle');
    if(tagged&&LABELS.includes(tagged.textContent.trim()))return tagged.textContent.trim();
    const matches=[...document.querySelectorAll('body *')].filter(el=>{
      if(!visible(el))return false;
      const r=el.getBoundingClientRect();
      return r.top>=0&&r.top<280&&r.width<340&&r.height<90&&LABELS.includes(el.textContent.trim());
    });
    if(matches.length){
      matches.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
      return matches[0].textContent.trim();
    }
    return 'Dashboard';
  }

  function findTopSectionElement(section){
    const matches=[...document.querySelectorAll('body *')].filter(el=>{
      if(!visible(el))return false;
      if(el.closest('.bottom-nav,.sidebar'))return false;
      const r=el.getBoundingClientRect();
      return r.top>=0&&r.top<280&&r.left>80&&r.width<360&&r.height<90&&el.textContent.trim()===section;
    });
    if(!matches.length)return null;
    matches.sort((a,b)=>{
      const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
      return (ra.width*ra.height)-(rb.width*rb.height);
    });
    return matches[0];
  }

  function styleBrandLogo(el,img){
    el.style.setProperty('overflow','hidden','important');
    el.style.setProperty('padding','0','important');
    el.style.setProperty('border-radius','50%','important');
    el.style.setProperty('background','#111','important');
    el.style.setProperty('display','flex','important');
    el.style.setProperty('align-items','center','important');
    el.style.setProperty('justify-content','center','important');
    img.style.setProperty('display','block','important');
    img.style.setProperty('width','100%','important');
    img.style.setProperty('height','100%','important');
    img.style.setProperty('object-fit','contain','important');
    img.style.setProperty('object-position','center','important');
    img.style.setProperty('border-radius','50%','important');
    img.style.setProperty('padding','0','important');
    img.style.setProperty('box-sizing','border-box','important');
    img.style.setProperty('background','transparent','important');
  }

  function ensureBrandLogo(){
    const holder=document.querySelector('[data-betel-logo="1"]');
    if(holder){
      let img=holder.querySelector('img');
      if(!img){
        img=document.createElement('img');
        img.alt='Betel Radar';
        holder.appendChild(img);
      }
      if(!img.src.includes('logo-br.svg?v=8124')) img.src='./logo-br.svg?v=8124';
      styleBrandLogo(holder,img);
      return;
    }

    const candidates=[...document.querySelectorAll('body *')].filter(el=>{
      if((el.textContent||'').trim()!=='HB')return false;
      const r=el.getBoundingClientRect();
      return r.width>=24&&r.width<=90&&r.height>=24&&r.height<=90&&r.top>=0&&r.top<140&&r.right>innerWidth-180;
    });
    if(!candidates.length)return;
    candidates.sort((a,b)=>{
      const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
      return rb.right-ra.right||ra.top-rb.top;
    });

    const el=candidates[0];
    el.textContent='';
    el.dataset.betelLogo='1';
    const img=document.createElement('img');
    img.alt='Betel Radar';
    img.decoding='async';
    img.src='./logo-br.svg?v=8124';
    el.appendChild(img);
    styleBrandLogo(el,img);
  }

  function ensureMobileHeader(){
    ensureBrandLogo();
    const mobile=window.matchMedia('(max-width:760px)').matches||window.innerWidth<=760;
    if(!mobile)return;

    const section=currentSection();
    let wrap=document.querySelector('.betel-mobile-title-wrap');
    let title=document.querySelector('.betel-mobile-title');
    let sub=document.querySelector('.betel-mobile-subtitle');

    if(!wrap){
      const sectionEl=findTopSectionElement(section);
      if(!sectionEl)return;
      wrap=document.createElement('div');
      wrap.className='betel-mobile-title-wrap';
      sectionEl.parentNode.insertBefore(wrap,sectionEl);
      wrap.appendChild(sectionEl);
      sub=sectionEl;
      sub.classList.add('betel-mobile-subtitle');
      title=document.createElement('div');
      title.className='betel-mobile-title';
      title.textContent='Betel Radar';
      wrap.insertBefore(title,sub);
    }

    if(!title){
      title=document.createElement('div');
      title.className='betel-mobile-title';
      title.textContent='Betel Radar';
      wrap.insertBefore(title,wrap.firstChild);
    }
    if(!sub){
      sub=[...wrap.children].find(el=>el!==title&&LABELS.includes(el.textContent.trim()))||null;
      if(sub)sub.classList.add('betel-mobile-subtitle');
    }

    title.textContent='Betel Radar';
    if(sub)sub.textContent=section;

    wrap.style.setProperty('display','flex','important');
    wrap.style.setProperty('flex-direction','column','important');
    wrap.style.setProperty('justify-content','center','important');
    wrap.style.setProperty('align-items','flex-start','important');
    wrap.style.setProperty('gap','0','important');
    wrap.style.setProperty('transform','translateX(-15px)','important');
    wrap.style.setProperty('transform-origin','left center','important');
    wrap.style.setProperty('min-width','0','important');

    title.style.setProperty('display','block','important');
    title.style.setProperty('font-size','24px','important');
    title.style.setProperty('line-height','1.03','important');
    title.style.setProperty('font-weight','800','important');
    title.style.setProperty('letter-spacing','-.025em','important');
    title.style.setProperty('color','#171717','important');
    title.style.setProperty('margin','0','important');
    title.style.setProperty('padding','0','important');
    title.style.setProperty('white-space','nowrap','important');

    if(sub){
      sub.style.setProperty('display','block','important');
      sub.style.setProperty('font-size','12px','important');
      sub.style.setProperty('line-height','1.1','important');
      sub.style.setProperty('font-weight','500','important');
      sub.style.setProperty('color','#7a7f87','important');
      sub.style.setProperty('margin','5px 0 0','important');
      sub.style.setProperty('padding','0','important');
      sub.style.setProperty('white-space','nowrap','important');
    }

    document.title='Betel Radar — '+section;
  }

  function schedule(){requestAnimationFrame(ensureMobileHeader);[60,180,420,900,1800].forEach(ms=>setTimeout(ensureMobileHeader,ms))}
  document.addEventListener('click',schedule,true);
  window.addEventListener('pageshow',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  new MutationObserver(()=>requestAnimationFrame(ensureMobileHeader)).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(schedule,200);
})();
