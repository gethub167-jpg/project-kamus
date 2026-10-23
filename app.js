(()=>{
'use strict';
const D=window.KAMUS_DATA||[];
const PAGE=30,$=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('id-ID');
/* ---------- normalisasi: abaikan huruf besar, aksen (é), apostrof, tanda baca ---------- */
function nzc(ch){return ch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’`´]/g,'').replace(/[^\p{L}\p{N}-]/gu,' ');}
const nz=s=>Array.from(String(s)).map(nzc).join('').replace(/\s+/g,' ').trim();
const tokens=q=>nz(q).split(' ').filter(t=>t.replace(/-/g,''));
/* ---------- penyimpanan (aman bila localStorage diblokir) ---------- */
const mem={};
const st={get(k){try{return localStorage.getItem(k)}catch(e){return k in mem?mem[k]:null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){mem[k]=v}}};
const load=(k,def)=>{try{const v=JSON.parse(st.get(k));return Array.isArray(v)?v:def}catch(e){return def}};
/* ---------- data: kelompokkan per kata entri ---------- */
const E=[],idx=new Map();
for(const [k,t,a,c,e] of D){
  let en=idx.get(k);
  if(!en){const kn=nz(k);en={id:E.length,k,kn,L:/^[a-z]/.test(kn)?kn[0].toUpperCase():'#',items:[]};idx.set(k,en);E.push(en);}
  en.items.push({t,tn:nz(t),a,an:nz(a),c,e});
}
/* ---------- pencarian ---------- */
function sc(f,toks,p){
  if(!f||!toks.every(t=>f.includes(t)))return 0;
  if(f===p)return 100;
  if(f.startsWith(p+' '))return 90;
  if((' '+f+' ').includes(' '+p+' '))return 80;
  if(f.startsWith(p))return 70;
  if((' '+f).includes(' '+p))return 60;
  return 40;
}
function search(toks,mode){
  const p=toks.join(' '),out=[];
  for(const en of E){
    let s=0;
    if(mode!=='indo'){
      s=sc(en.kn,toks,p);
      for(const it of en.items){if(it.t){const v=sc(it.tn,toks,p)*.7;if(v>s)s=v;}}
    }
    if(mode!=='kutai'){
      const w=mode==='semua'?.8:1;
      for(const it of en.items){const v=sc(it.an,toks,p)*w;if(v>s)s=v;}
    }
    if(s>0)out.push([s,en]);
  }
  out.sort((x,y)=>y[0]-x[0]||x[1].id-y[1].id);
  return out.map(x=>x[1]);
}
/* ---------- sorot hasil (aman XSS, tahan aksen) ---------- */
function hl(text,toks){
  text=String(text);
  if(!toks.length||!text)return esc(text);
  let norm='',i=0;const S0=[],E0=[];
  for(const ch of text){const n=nzc(ch);for(let j=0;j<n.length;j++){S0.push(i);E0.push(i+ch.length);}norm+=n;i+=ch.length;}
  const r=[];
  for(const t of toks){let p=norm.indexOf(t);while(p>-1){r.push([S0[p],E0[p+t.length-1]]);p=norm.indexOf(t,p+t.length);}}
  if(!r.length)return esc(text);
  r.sort((a,b)=>a[0]-b[0]);
  let o='',pos=0;
  for(const [s,e] of r){if(e<=pos)continue;const s2=Math.max(s,pos);o+=esc(text.slice(pos,s2))+'<mark>'+esc(text.slice(s2,e))+'</mark>';pos=e;}
  return o+esc(text.slice(pos));
}
const tl=h=>h.replace(/~/g,'<span class="tl">~</span>');
/* ---------- state ---------- */
const favs=new Set(load('kk_fav',[]));
let hist=load('kk_hist',[]).filter(x=>typeof x==='string');
const S={q:'',mode:'kutai',letter:'',tab:'kamus',shown:PAGE,pin:null};
let cur=[],timer=null,tt=null;
/* ---------- tampilan kartu ---------- */
function card(en,toks,mode,label){
  const kt=mode==='indo'?[]:toks,it_=mode==='kutai'?[]:toks,fav=favs.has(en.k);
  let prev=null;
  const li=en.items.map(it=>{
    const showT=it.t&&it.t!==prev;prev=it.t;
    return '<li class="m">'+
      (showT?'<button class="tag" data-act="q" data-q="'+esc(it.t)+'" data-mode="kutai" title="Cari bentuk ini">'+hl(it.t,kt)+'</button>':'')+
      '<span class="ar">'+(it.a?hl(it.a,it_):'<span class="na">(arti tidak dicantumkan)</span>')+'</span>'+
      (it.c||it.e?'<div class="ex">'+(it.c?'<div class="k">'+tl(esc(it.c))+'</div>':'')+(it.e?'<div class="i">→ '+esc(it.e)+'</div>':'')+'</div>':'')+
      '</li>';
  }).join('');
  const n=en.items.length;
  return '<article class="card">'+(label?'<div class="eyebrow">'+label+'</div>':'')+
    '<div class="ch"><h2 class="hw">'+hl(en.k,kt)+'</h2><span class="cnt">'+n+' makna</span>'+
    '<div class="acts"><button class="ib" data-act="copy" data-i="'+en.id+'" title="Salin" aria-label="Salin '+esc(en.k)+'">⧉</button>'+
    '<button class="ib fv'+(fav?' on':'')+'" data-act="fav" data-i="'+en.id+'" aria-pressed="'+fav+'" title="Favorit" aria-label="Favorit '+esc(en.k)+'">'+(fav?'★':'☆')+'</button></div></div>'+
    '<ol class="ml">'+li+'</ol></article>';
}
const cand=E.filter(e=>e.items.some(i=>i.c&&i.e&&i.a));
const wotd=(()=>{const pool=cand.length?cand:E;if(!pool.length)return null;const d=new Date(),seed=d.getFullYear()*372+d.getMonth()*31+d.getDate();return pool[(seed*2654435761>>>0)%pool.length];})();
function render(){
  const toks=tokens(S.q);let list,meta='',empty='';
  const home=S.tab==='kamus'&&!S.pin&&!toks.length&&!S.letter;
  if(S.tab==='fav'){
    list=E.filter(e=>favs.has(e.k));
    meta=list.length?fmt(list.length)+' kata favorit':'';
    if(!list.length)empty='<div class="empty">Belum ada favorit.<br>Tekan ☆ pada sebuah kata untuk menyimpannya di sini.</div>';
  }else if(S.pin){list=S.pin;meta='Kata acak<button class="lk" data-act="reset">← Lihat semua</button>';}
  else if(toks.length){
    list=search(toks,S.mode);
    meta=fmt(list.length)+' entri untuk “<b>'+esc(S.q.trim())+'</b>”';
    if(!list.length)empty='<div class="empty">Tidak ada hasil untuk “'+esc(S.q.trim())+'”.<br>Periksa ejaan atau coba arah pencarian lain.'+(S.mode!=='semua'?'<br><button data-act="all">Cari di semua kolom</button>':'')+'</div>';
  }else if(S.letter){list=E.filter(e=>e.L===S.letter);meta=fmt(list.length)+' entri berawalan huruf <b>'+esc(S.letter)+'</b>';}
  else{list=E;meta=fmt(E.length)+' entri';}
  cur=list;
  let hero='';
  if(home){
    if(hist.length)hero+='<div class="hist"><b>Pencarian terakhir:</b>'+hist.map(h=>'<button class="h" data-act="q" data-q="'+esc(h)+'">'+esc(h)+'</button>').join('')+'<button class="lk" data-act="clearhist">Hapus</button></div>';
    if(wotd)hero+=card(wotd,[],S.mode,'Kata hari ini');
  }
  $('#hero').innerHTML=hero;
  $('#meta').innerHTML=meta;
  $('#list').innerHTML=list.length?list.slice(0,S.shown).map(en=>card(en,toks,S.mode)).join(''):empty;
  const rest=list.length-S.shown;
  $('#more').hidden=rest<=0;
  if(rest>0)$('#more').textContent='Tampilkan lebih banyak ('+fmt(rest)+' lagi)';
  sync();
}
function sync(){
  $('#tab-kamus').setAttribute('aria-selected',S.tab==='kamus');
  $('#tab-fav').setAttribute('aria-selected',S.tab==='fav');
  $('#fc').textContent=favs.size;
  $('#clr').hidden=!$('#q').value;
  document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===S.mode));
  document.querySelectorAll('#az button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.l||'')===S.letter));
  $('#q').placeholder=S.mode==='indo'?'Ketik kata Indonesia, mis. ejek…':S.mode==='semua'?'Cari kata Kutai atau artinya…':'Ketik kata Kutai, mis. acak…';
}
/* ---------- aksi ---------- */
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),1800);}
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true;}
  catch(e){try{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0;left:-9999px';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(e2){return false;}}
}
function addHist(q){
  q=q.trim();if(nz(q).length<2)return;
  if(!search(tokens(q),S.mode).length)return;
  hist=[q,...hist.filter(h=>nz(h)!==nz(q))].slice(0,8);
  st.set('kk_hist',JSON.stringify(hist));
}
function setQuery(q,mode){
  clearTimeout(timer);
  S.q=q;S.letter='';S.pin=null;S.tab='kamus';S.shown=PAGE;
  if(mode)S.mode=mode;
  $('#q').value=q;
  render();addHist(q);
  window.scrollTo({top:0,behavior:'smooth'});
}
function toggleFav(en){
  const on=!favs.has(en.k);
  if(on)favs.add(en.k);else favs.delete(en.k);
  st.set('kk_fav',JSON.stringify([...favs]));
  if(S.tab==='fav'){render();}
  else{document.querySelectorAll('[data-act="fav"][data-i="'+en.id+'"]').forEach(b=>{b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.textContent=on?'★':'☆';});sync();}
  toast(on?'Ditambahkan ke favorit':'Dihapus dari favorit');
}
function onClick(e){
  const b=e.target.closest('[data-act]');if(!b)return;
  const act=b.dataset.act,en=b.dataset.i!==undefined?E[+b.dataset.i]:null;
  if(act==='fav'&&en)toggleFav(en);
  else if(act==='copy'&&en)copyText(en.k+'\n'+en.items.map((it,i)=>(i+1)+'. '+(it.a||'-')).join('\n')).then(ok=>toast(ok?'Disalin ke papan klip':'Gagal menyalin'));
  else if(act==='q')setQuery(b.dataset.q,b.dataset.mode);
  else if(act==='reset'){S.pin=null;S.q='';S.letter='';S.shown=PAGE;$('#q').value='';render();}
  else if(act==='all'){S.mode='semua';S.shown=PAGE;render();}
  else if(act==='clearhist'){hist=[];st.set('kk_hist','[]');render();}
}
/* ---------- inisialisasi ---------- */
function init(){
  const letters=[...new Set(E.map(e=>e.L))].sort((a,b)=>a==='#'?1:b==='#'?-1:a<b?-1:1);
  $('#az').innerHTML='<button data-l="" aria-pressed="true">Semua</button>'+letters.map(l=>'<button data-l="'+esc(l)+'" aria-pressed="false">'+esc(l)+'</button>').join('');
  $('#stat').textContent='Kutai ⇄ Indonesia · '+fmt(E.length)+' entri · '+fmt(D.length)+' makna';
  $('#src').textContent='Sumber data: Kamus_Bahasa_Kutai_Terstruktur_Rapi.xlsx';
  const inp=$('#q');
  inp.addEventListener('input',()=>{
    S.q=inp.value;S.letter='';S.pin=null;S.tab='kamus';S.shown=PAGE;sync();
    clearTimeout(timer);timer=setTimeout(render,110);
  });
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){clearTimeout(timer);render();addHist(S.q);inp.blur();}
    else if(e.key==='Escape'&&inp.value){inp.value='';S.q='';clearTimeout(timer);render();}
  });
  inp.addEventListener('blur',()=>{if(S.q.trim())addHist(S.q);});
  $('#clr').addEventListener('click',()=>{inp.value='';S.q='';clearTimeout(timer);render();inp.focus();});
  document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>{S.mode=b.dataset.mode;S.shown=PAGE;S.pin=null;render();}));
  $('#az').addEventListener('click',e=>{
    const b=e.target.closest('button[data-l]');if(!b)return;
    S.letter=b.dataset.l;S.q='';inp.value='';S.pin=null;S.tab='kamus';S.shown=PAGE;render();
    window.scrollTo({top:0,behavior:'smooth'});
  });
  $('#tab-kamus').addEventListener('click',()=>{S.tab='kamus';S.shown=PAGE;render();});
  $('#tab-fav').addEventListener('click',()=>{S.tab='fav';S.shown=PAGE;render();window.scrollTo({top:0});});
  $('#more').addEventListener('click',()=>{S.shown+=PAGE;render();});
  $('#rnd').addEventListener('click',()=>{
    if(!E.length)return;
    S.pin=[E[Math.floor(Math.random()*E.length)]];S.tab='kamus';S.q='';S.letter='';inp.value='';S.shown=PAGE;render();
    window.scrollTo({top:0,behavior:'smooth'});
  });
  $('#list').addEventListener('click',onClick);
  $('#hero').addEventListener('click',onClick);
  $('#meta').addEventListener('click',onClick);
  document.addEventListener('keydown',e=>{
    if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();inp.focus();inp.select();}
  });
  /* tema */
  const root=document.documentElement,isDark=()=>root.dataset.theme?root.dataset.theme==='dark':!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  const icon=()=>{$('#thm').textContent=isDark()?'☀':'☾';};
  const saved=st.get('kk_theme');if(saved==='dark'||saved==='light')root.dataset.theme=saved;
  icon();
  $('#thm').addEventListener('click',()=>{const n=isDark()?'light':'dark';root.dataset.theme=n;st.set('kk_theme',n);icon();});
  if(!E.length)$('#list').innerHTML='<div class="empty">Data kamus tidak dapat dimuat.</div>';
  else render();
}
init();
})();
