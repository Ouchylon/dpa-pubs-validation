/* app.js — pages « review » (Steve) et « admin » (Ouchylon). Store = store.js */
(function () {
  if (window.__DPA_BLOCK__) return;            // verrou admin
  const D = window.DPA_DATA, C = window.DPA_CONFIG || {};
  const CAT = {produit:{c:'var(--c-produit)',l:'Produit'},montalpi:{c:'var(--c-montalpi)',l:'Mont Alpi'},
    conseil:{c:'var(--c-conseil)',l:'Conseil'},equipe:{c:'var(--c-equipe)',l:'Équipe'},aspirationnel:{c:'var(--c-aspirationnel)',l:'Aspirationnel'}};
  const TRACKS = {google:{l:'Google (priorité #1)',c:'#4285F4'},catalogue:{l:'Ventes catalogue',c:'#16ABF5'},
    retargeting:{l:'Retargeting',c:'#0FB5A6'},hero:{l:'Produit héros',c:'#7C6BD9'},local:{l:'Magasin / local',c:'#EA9A0B'},
    lead:{l:'Lead gen',c:'#E8734A'},seo:{l:'SEO / Contenu',c:'#34A853'},promo:{l:'Saisonnier / promo',c:'#8798AB'}};
  const FMT={feed:'Feed',carousel:'Carrousel',story:'Story'};

  // flat list with stable ad_id + label
  D.organic.forEach(a=>{a.ad_id=a.ad_id||('O'+a.n); a.kind='organic'; a.label='#'+a.n+' '+a.title;});
  D.paid.forEach(a=>{a.ad_id=a.id; a.kind='paid'; a.label=a.id+' '+a.name;});
  const ALL=[...D.paid, ...D.organic];
  const byId={}; ALL.forEach(a=>byId[a.ad_id]=a);

  const PAGE=document.body.dataset.page; // 'review' | 'admin'
  let state={};           // ad_id -> row
  let view='paid', filter='all';
  let reviewer = localStorage.getItem('dpa_reviewer') || C.reviewerDefault || 'Steve';

  const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ---------------- REVIEW (Steve) ---------------- */
  const WEEKS = (D.weeks && D.weeks.length) ? D.weeks
    : [{w:1,t:'Semaine 1',rng:''},{w:2,t:'Semaine 2',rng:''},{w:3,t:'Semaine 3',rng:''},{w:9,t:'Extras',rng:''}];

  function renderReview(){
    renderPaidReview(); renderOrgReview();
    document.getElementById('legend').innerHTML = view==='paid'?legendPaid():legendOrg();
    updateProgress(); applyFilter();
  }
  function mediaBlock(a, tr, label){
    if(a.slides.length)
      return `<div class="media wide" data-id="${a.ad_id}"><img src="${a.slides[0]}" alt="" loading="lazy"><span class="zoom">⤢</span>
        <div class="badges"><span class="tagpill">${esc(label)}</span></div></div>`;
    return `<div class="media wide ph" style="background:linear-gradient(135deg,${tr.c},${tr.c}bb)">
        <div><div style="font-size:26px">🗂️</div><div style="font-weight:700;font-size:13px;margin-top:4px">${esc(label)}</div>
        <div style="font-size:11.5px;opacity:.92;margin-top:2px">Visuel = fiches produits / catalogue</div></div></div>`;
  }
  function paidCardR(p){
    const tr=TRACKS[p.track]; const el=document.createElement('article');
    el.className='card'; el.dataset.id=p.ad_id; el.style.setProperty('--tc',tr.c);
    el.innerHTML=`
      ${mediaBlock(p, tr, p.id+' · '+tr.l)}
      <div class="body">
        <div class="ttl">${esc(p.name)}</div>
        <div class="why"><b>Pourquoi :</b> ${esc(p.why)}</div>
        <div class="cap">${esc(p.primary)}</div>
        <button class="more">Voir le texte complet</button>
        <div class="meta"><b>Objectif :</b> ${esc(p.objective)} · <b>Budget :</b> ${esc(p.budget)}<br>
          <b>Cible :</b> ${esc(p.geo)} · ${esc(p.age)}</div>
        <div class="dest"><span class="dl">🔗 Lien (${esc(p.cta)})</span> ${/^https?:/.test(p.link)?`<a href="${p.link}" target="_blank" rel="noopener">${esc(p.link.replace(/^https?:\/\//,''))}</a>`:`<span class="dtxt">${esc(p.link)}</span>`}</div>
        ${decBlock(p.ad_id)}
      </div>`;
    wireCard(el,p); return el;
  }
  function orgCardR(a){
    const cat=CAT[a.cat]; const el=document.createElement('article');
    el.className='card'; el.dataset.id=a.ad_id;
    const when=a.date?`<span class="d">${a.dow} ${esc(a.dateLabel)}</span> · ${a.time}`:`<span class="d">Sans date</span>`;
    const isVid=a.slideKinds&&a.slideKinds[0]==='video';
    const fmtLabel=isVid?'▶ Vidéo':(a.fmt==='carousel'?`Carrousel · ${a.slides.length}`:(FMT[a.fmt]||'Post'));
    const gst=a.ghlStatus?` · <span style="font-weight:700;color:${a.ghlStatus==='scheduled'?'var(--keep)':'var(--muted)'}">${a.ghlStatus==='scheduled'?'● cédulé':'○ brouillon'}</span>`:'';
    const badges=`<div class="badges"><span class="tagpill">${fmtLabel}</span><span class="cat" style="background:${cat.c}">${cat.l}</span></div><span class="num">#${a.n}</span>`;
    const media=!a.slides.length
      ? `<div class="media ph" style="aspect-ratio:1/1;background:linear-gradient(135deg,${cat.c},${cat.c}bb)"><div><div style="font-size:24px">📝</div><div style="font-weight:700;font-size:12.5px;margin-top:3px">Publication texte</div></div>${badges}</div>`
      : isVid
      ? `<div class="media vid" data-id="${a.ad_id}"><video src="${a.slides[0]}" controls preload="metadata" playsinline></video>${badges}</div>`
      : `<div class="media ${a.fmt==='story'?'story':''}" data-id="${a.ad_id}"><img src="${a.slides[0]}" alt="" loading="lazy"><span class="zoom">⤢</span>${badges}</div>`;
    el.innerHTML=`
      ${media}
      <div class="body">
        <div class="when">${when}${a.extra?'':' · <b style="color:var(--ink)">FB · IG</b>'}${gst}</div>
        <div class="ttl">${esc(a.title)}</div>
        <div class="cap">${esc(a.cap)}</div>
        <button class="more">Voir le texte complet</button>
        ${decBlock(a.ad_id)}
      </div>`;
    wireCard(el,a); return el;
  }
  function decBlock(id){const r=state[id]||{}; const st=r.status||'';
    return `<div class="dec">
        <button class="v" aria-pressed="${st==='valide'}">✓ Valider</button>
        <button class="r" aria-pressed="${st==='refuse'}">✗ Refuser</button></div>
      <textarea class="cmt" placeholder="Commentaire pour Ouchylon (optionnel)...">${esc(r.comment||'')}</textarea>
      <div class="saved">✓ enregistré</div>`;
  }
  function wireCard(el,a){
    const cap=el.querySelector('.cap'), more=el.querySelector('.more');
    requestAnimationFrame(()=>{if(cap.scrollHeight<=cap.clientHeight+2)more.style.display='none';});
    more.addEventListener('click',()=>{cap.classList.toggle('open');more.textContent=cap.classList.contains('open')?'Réduire':'Voir le texte complet';});
    const media=el.querySelector('.media');
    const vid=a.slideKinds&&a.slideKinds[0]==='video';
    if(a.slides.length && media && !vid) media.addEventListener('click',()=>openLB(a,0));
    const v=el.querySelector('.v'), r=el.querySelector('.r'), cmt=el.querySelector('.cmt');
    v.addEventListener('click',()=>setStatus(a.ad_id, 'valide'));
    r.addEventListener('click',()=>setStatus(a.ad_id, 'refuse'));
    let t; cmt.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>saveRow(a.ad_id),700);});
    cmt.addEventListener('blur',()=>saveRow(a.ad_id));
  }
  function renderPaidReview(){
    const app=document.getElementById('paidApp'); if(!app)return; app.innerHTML='';
    Object.keys(TRACKS).forEach(tk=>{
      const items=D.paid.filter(p=>p.track===tk); if(!items.length)return;
      const sec=document.createElement('section'); sec.className='sec';
      sec.innerHTML=`<div class="sec-h"><h2>${TRACKS[tk].l}</h2><span class="rng">${items.length} pub(s)</span><span class="ln"></span></div>`;
      const g=document.createElement('div'); g.className='grid'; items.forEach(p=>g.appendChild(paidCardR(p)));
      sec.appendChild(g); app.appendChild(sec);
    });
  }
  function renderOrgReview(){
    const app=document.getElementById('orgApp'); if(!app)return; app.innerHTML='';
    WEEKS.forEach(wk=>{
      const items=D.organic.filter(a=>a.w===wk.w); if(!items.length)return;
      const sec=document.createElement('section'); sec.className='sec';
      sec.innerHTML=`<div class="sec-h"><h2>${wk.t}</h2><span class="rng">${wk.rng}</span><span class="ln"></span></div>`;
      const g=document.createElement('div'); g.className='grid'; items.forEach(a=>g.appendChild(orgCardR(a)));
      sec.appendChild(g); app.appendChild(sec);
    });
  }

  function setStatus(id,val){
    const r=state[id]||(state[id]={ad_id:id});
    r.status=(r.status===val)?null:val;
    paintCard(id); saveRow(id); updateProgress(); applyFilter();
  }
  function paintCard(id){
    document.querySelectorAll(`.card[data-id="${id}"]`).forEach(card=>{
      const st=(state[id]||{}).status||''; card.classList.remove('valide','refuse'); if(st)card.classList.add(st);
      card.dataset.st=st;
      const v=card.querySelector('.v'),r=card.querySelector('.r');
      if(v)v.setAttribute('aria-pressed',st==='valide'); if(r)r.setAttribute('aria-pressed',st==='refuse');
    });
  }
  async function saveRow(id){
    const card=document.querySelector(`.card[data-id="${id}"]`);
    const cmt=card?card.querySelector('.cmt'):null;
    const a=byId[id]; const r=state[id]||(state[id]={ad_id:id});
    r.comment = cmt?cmt.value:(r.comment||''); r.reviewer=reviewer;
    const row={ad_id:id, ad_label:a.label, ad_kind:a.kind, status:r.status||null, comment:r.comment||null, reviewer:reviewer};
    const badge=card?card.querySelector('.saved'):null;
    try{ await Store.save(row); if(badge){badge.textContent='✓ enregistré';badge.className='saved on';setTimeout(()=>badge.classList.remove('on'),1600);} }
    catch(e){ if(badge){badge.textContent='⚠ non enregistré — réessayez';badge.className='saved on err';} }
  }
  function updateProgress(){
    const el=document.getElementById('prog'); if(!el)return;
    const done=ALL.filter(a=>(state[a.ad_id]||{}).status).length;
    el.textContent=`${done}/${ALL.length} répondues`;
  }

  /* ---------------- ADMIN (Ouchylon) ---------------- */
  function renderAdmin(){
    // tiles
    let v=0,r=0; const revs=new Set();
    ALL.forEach(a=>{const s=state[a.ad_id]; if(s){if(s.status==='valide')v++;else if(s.status==='refuse')r++; if(s.reviewer)revs.add(s.reviewer);}});
    const att=ALL.length-v-r;
    document.getElementById('tiles').innerHTML=`
      <div class="tile v-valide"><div class="k">Validées</div><div class="v">${v}</div></div>
      <div class="tile v-refuse"><div class="k">Refusées</div><div class="v">${r}</div></div>
      <div class="tile v-attente"><div class="k">En attente</div><div class="v">${att}</div></div>
      <div class="tile"><div class="k">Validateur(s)</div><div class="v" style="font-size:16px;font-weight:700;padding-top:8px">${[...revs].map(esc).join(', ')||'—'}</div></div>`;
    // rows
    const list=document.getElementById('adminList'); list.innerHTML='';
    const items = view==='paid'?D.paid:D.organic;
    items.forEach(a=>list.appendChild(adminRow(a)));
    applyFilter();
  }
  function adminRow(a){
    const s=state[a.ad_id]||{}; const st=s.status||'attente';
    const el=document.createElement('div'); el.className='arow'; el.dataset.id=a.ad_id; el.dataset.st=(s.status||'attente');
    const sub = a.kind==='paid'
      ? `${a.id} · ${TRACKS[a.track].l} · ${esc(a.objective)}`
      : `#${a.n} · ${a.date?(a.dow+' '+a.dateLabel+' '+a.time):'sans date'}${a.ghlStatus?' · GHL '+(a.ghlStatus==='scheduled'?'cédulé':'brouillon'):''}`;
    const stLabel={valide:'✓ Validée',refuse:'✗ Refusée',attente:'En attente'}[st];
    const cbub = s.comment ? `<div class="cbub"><div class="qui">${esc(s.reviewer||'Steve')} a écrit</div>${esc(s.comment)}</div>` : '';
    const thumb = a.slides.length
      ? `<img class="th" src="${a.slides[0]}" alt="" loading="lazy">`
      : `<div class="th" style="display:grid;place-items:center;background:${a.kind==='paid'?TRACKS[a.track].c:'var(--surface-2)'};color:#fff">🗂️</div>`;
    el.innerHTML=`${thumb}
      <div class="mid"><div class="nm">${esc(a.kind==='paid'?a.name:a.title)}</div><div class="sub">${sub}</div>${cbub}</div>
      <span class="stbadge ${st}">${stLabel}</span>`;
    const th=el.querySelector('img.th'); if(th) th.addEventListener('click',()=>openLB(a,0));
    return el;
  }

  /* ---------------- filters / tabs / live ---------------- */
  const legendPaid=()=>Object.values(TRACKS).map(t=>`<span class="lg"><i style="background:${t.c}"></i>${t.l}</span>`).join('');
  const legendOrg=()=>Object.values(CAT).map(c=>{const col={produit:'#16ABF5',montalpi:'#EA9A0B',conseil:'#0FB5A6',equipe:'#7C6BD9',aspirationnel:'#8798AB'};
    return `<span class="lg"><i style="background:${col[Object.keys(CAT).find(k=>CAT[k]===c)]}"></i>${c.l}</span>`;}).join('');
  function applyFilter(){
    const sel = PAGE==='admin' ? '.arow' : '.card';
    document.querySelectorAll(sel).forEach(c=>{
      const st=c.dataset.st||'attente';
      const match = filter==='all' || (filter==='attente'? (st===''||st==='attente') : filter===st);
      c.classList.toggle('hidden',!match);
    });
    document.querySelectorAll('.sec').forEach(s=>{
      const any=[...s.querySelectorAll('.card')].some(c=>!c.classList.contains('hidden'));
      s.style.display=any?'':'none';
    });
  }
  function setView(v){
    view=v;
    const tp=document.getElementById('tabPaid'), to=document.getElementById('tabOrg');
    if(tp){tp.setAttribute('aria-selected',v==='paid'); to.setAttribute('aria-selected',v==='org');}
    const vp=document.getElementById('viewPaid'), vo=document.getElementById('viewOrg');
    if(vp){vp.classList.toggle('on',v==='paid'); vo.classList.toggle('on',v==='org');}
    const lg=document.getElementById('legend'); if(lg&&PAGE==='review') lg.innerHTML=v==='paid'?legendPaid():legendOrg();
    if(PAGE==='admin') renderAdmin(); else applyFilter();
    scrollTo({top:0,behavior:'instant'});
  }
  function mergeRemote(map){
    // update local state from remote, without clobbering a comment being typed
    const active=document.activeElement;
    Object.keys(map).forEach(id=>{ state[id]=map[id]; });
    if(PAGE==='admin'){ renderAdmin(); return; }
    Object.keys(map).forEach(id=>{
      paintCard(id);
      const card=document.querySelector(`.card[data-id="${id}"]`); if(!card)return;
      const cmt=card.querySelector('.cmt'); if(cmt && cmt!==active) cmt.value=map[id].comment||'';
    });
    updateProgress(); applyFilter();
  }

  /* ---------------- lightbox / toast / theme ---------------- */
  let lbAd=null,lbI=0; const lb=document.getElementById('lb');
  function openLB(a,i){lbAd=a;lbI=i;lb.classList.add('on');drawLB();}
  function drawLB(){const img=document.getElementById('lbImg'); img.src=lbAd.slides[lbI];
    const m=lbAd.slides.length>1; document.getElementById('lbP').style.display=document.getElementById('lbN').style.display=m?'grid':'none';
    const c=document.getElementById('lbC'); c.style.display=m?'block':'none'; if(m)c.textContent=`${lbI+1} / ${lbAd.slides.length}`;}
  function step(d){if(!lbAd)return;lbI=(lbI+d+lbAd.slides.length)%lbAd.slides.length;drawLB();}
  if(lb){
    document.getElementById('lbP').addEventListener('click',e=>{e.stopPropagation();step(-1);});
    document.getElementById('lbN').addEventListener('click',e=>{e.stopPropagation();step(1);});
    document.getElementById('lbX').addEventListener('click',()=>lb.classList.remove('on'));
    lb.addEventListener('click',e=>{if(e.target===lb)lb.classList.remove('on');});
    addEventListener('keydown',e=>{if(!lb.classList.contains('on'))return;
      if(e.key==='Escape')lb.classList.remove('on');if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1);});
  }
  let tT; window.toast=function(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),2600);};
  const tb=document.getElementById('themeBtn');
  if(tb)tb.addEventListener('click',()=>{const cur=document.documentElement.getAttribute('data-theme');
    const mq=matchMedia('(prefers-color-scheme:dark)').matches;
    document.documentElement.setAttribute('data-theme',(cur?cur==='dark':mq)?'light':'dark');});

  /* ---------------- wiring ---------------- */
  const tp=document.getElementById('tabPaid'), to=document.getElementById('tabOrg');
  if(tp){tp.addEventListener('click',()=>setView('paid')); to.addEventListener('click',()=>setView('org'));}
  const flt=document.getElementById('filters');
  if(flt)flt.addEventListener('click',e=>{const b=e.target.closest('.chip'); if(!b)return; filter=b.dataset.f;
    flt.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c===b)); applyFilter();});
  const nameIn=document.getElementById('reviewer');
  if(nameIn){nameIn.value=reviewer; nameIn.addEventListener('change',()=>{reviewer=nameIn.value.trim()||'Steve';localStorage.setItem('dpa_reviewer',reviewer);});}

  // mode indicator
  const mb=document.getElementById('modebar');
  if(mb){ if(Store.mode==='cloud'){mb.className='modebar cloud';mb.innerHTML='● Connecté — les réponses sont envoyées à Ouchylon automatiquement.';}
    else {mb.className='modebar local';mb.innerHTML='● Mode local (non configuré) — vos réponses restent sur cet appareil. Utilisez « Envoyer mes réponses » à la fin.';} }

  // export (admin + review-local fallback)
  const exp=document.getElementById('exportBtn');
  if(exp)exp.addEventListener('click',()=>{
    const lines=['PUBLICITÉS DPA — Réponses',''];
    const grp=(k,lab)=>{const arr=ALL.filter(a=>((state[a.ad_id]||{}).status||'attente')===k);
      lines.push(`${lab} (${arr.length})`); arr.forEach(a=>{const s=state[a.ad_id]||{};
        lines.push(`- ${a.label}${s.comment?'  ▸ '+s.comment:''}`);}); lines.push('');};
    grp('valide','✅ VALIDÉES'); grp('refuse','❌ REFUSÉES'); grp('attente','⬜ EN ATTENTE');
    const txt=lines.join('\n');
    const okMsg = PAGE==='review' ? 'Réponses copiées — collez-les dans un message à Ouchylon' : 'Réponses copiées';
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject())
      .then(()=>toast(okMsg)).catch(()=>{
        const b=new Blob([txt],{type:'text/plain'}),u=URL.createObjectURL(b),x=document.createElement('a');
        x.href=u;x.download='reponses-pubs-dpa.txt';x.click();URL.revokeObjectURL(u);toast('Fichier téléchargé — envoyez-le à Ouchylon');});
  });

  /* ---------------- init ---------------- */
  Store.getAll().then(m=>{ state=m||{};
    if(PAGE==='admin') renderAdmin(); else renderReview();
    Store.watch(mergeRemote);
  }).catch(()=>{ state={}; if(PAGE==='admin') renderAdmin(); else renderReview(); });
})();
