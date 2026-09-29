const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS=['Électronique','Téléphones','Ordinateurs','Mode','Maison','Véhicules','Immobilier','Emploi','Beauté','Réparation','Transport','Éducation','Informatique','Construction','Restaurant','Agriculture','Services professionnels','Autres'];
const CUR=['USD','EUR','CAD','GBP','HTG','DOP','MXN','BRL','CHF','JPY','NGN','XOF'];
const COUNTRIES=['Haïti','États-Unis','Canada','France','Royaume-Uni','République dominicaine','Mexique','Brésil','Espagne','Allemagne','Italie','Belgique','Suisse','Nigeria','Sénégal','Côte d\'Ivoire','Cameroun','Maroc','Inde','Japon','Chine','Australie','Autre'];
const TYPES={products:'📦',services:'🛠️',businesses:'🏪'};
const I18N={fr:{home:'Accueil',search:'Recherche',publish:'Publier',fav:'Favoris',profile:'Profil',products:'Produits',services:'Services',businesses:'Entreprises',ph:'Rechercher…',login:'Connexion',logout:'Déconnexion',popular:'Récents',all:'Tout'},
 en:{home:'Home',search:'Search',publish:'Post',fav:'Saved',profile:'Profile',products:'Products',services:'Services',businesses:'Businesses',ph:'Search…',login:'Log in',logout:'Log out',popular:'Latest',all:'All'},
 ht:{home:'Akèy',search:'Chèche',publish:'Pibliye',fav:'Favori',profile:'Pwofil',products:'Pwodwi',services:'Sèvis',businesses:'Biznis',ph:'Chèche…',login:'Konekte',logout:'Dekonekte',popular:'Resan',all:'Tout'}};
let lang=localStorage.getItem('helpy_lang')||'fr';const t=k=>I18N[lang][k]||k;
let favs=new Set();
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2600);}
const money=(p,c)=>p==null?'':new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(p)+' '+(c||'');
const ago=d=>new Date(d).toLocaleDateString();
const stars=r=>+r?`<span class="star">★</span> ${r}`:'';
const need=()=>{if(!API.token()){toast('Vous devez être connecté pour continuer.');location.hash='#/login';return false}return true};
const opts=(a,sel)=>a.map(x=>`<option ${x===sel?'selected':''}>${esc(x)}</option>`).join('');

async function refreshChrome(){
 let c={notifications:0,messages:0};
 if(API.token()){try{c=await API.get('/counts');favs=new Set((await API.get('/favorites/ids')).map(f=>f.item_type+':'+f.item_id));}catch{}}
 $('#top').innerHTML=`<a href="#/" class="logo">HELPY<small>Buy • Sell • Services • Businesses</small></a><div class="hd">
 <select class="lang" id="lg">${['fr','en','ht'].map(l=>`<option value="${l}" ${l===lang?'selected':''}>${l==='ht'?'Kreyòl':l.toUpperCase()}</option>`).join('')}</select>
 <a class="ib" href="#/messages">✉️${c.messages?`<span class="badge">${c.messages}</span>`:''}</a>
 <a class="ib" href="#/notifications">🔔${c.notifications?`<span class="badge">${c.notifications}</span>`:''}</a></div>`;
 $('#lg').onchange=e=>{lang=e.target.value;localStorage.setItem('helpy_lang',lang);refreshChrome();route();};
 const h=location.hash||'#/',on=p=>h.startsWith(p)&&(p!=='#/'||h==='#/')?'on':'';
 $('#nav').innerHTML=`<a href="#/" class="${on('#/')}"><span>🏠</span>${t('home')}</a><a href="#/search" class="${on('#/search')}"><span>🔍</span>${t('search')}</a>
 <a href="#/publish" class="pub"><span>＋</span>${t('publish')}</a><a href="#/favorites" class="${on('#/favorites')}"><span>♡</span>${t('fav')}</a><a href="#/profile" class="${on('#/profile')}"><span>👤</span>${t('profile')}</a>`;
}
function card(it,type){
 type=it.item_type||type;const ph=(it.photos||[])[0],k=type+':'+it.id;
 return `<a class="card" href="#/item/${type}/${it.id}"><div class="im" style="${ph?`background-image:url('${esc(ph)}')`:''}">${ph?'':TYPES[type]}</div>
 <button class="heart" data-f="${k}">${favs.has(k)?'❤️':'🤍'}</button><div class="b"><b>${esc(it.title)}</b>${type!=='businesses'&&it.price!=null?`<div class="price">${money(it.price,it.currency)}</div>`:`<div class="price">${esc(it.category)}</div>`}
 <div class="mut">${esc([it.city,it.country].filter(Boolean).join(', '))} ${stars(it.rating)}</div></div></a>`;}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-f]');if(!b)return;e.preventDefault();e.stopPropagation();
 if(!need())return;const[tp,id]=b.dataset.f.split(':');
 try{if(favs.has(b.dataset.f)){await API.del(`/favorites/${tp}/${id}`);favs.delete(b.dataset.f);b.textContent='🤍';}else{await API.post('/favorites',{item_type:tp,item_id:+id});favs.add(b.dataset.f);b.textContent='❤️';}}catch(x){toast(x.message)}});
const grid=(a,type)=>a.length?`<div class="grid">${a.map(i=>card(i,type)).join('')}</div>`:`<div class="empty">Aucun résultat.</div>`;

async function home(){
 const[p,s,b]=await Promise.all(['products','services','businesses'].map(x=>API.get(`/${x}?limit=8`)));
 app.innerHTML=`<form class="search" id="sf"><input id="q" placeholder="${t('ph')}"><button class="btn">🔍</button></form>
 <div class="chips">${CATS.map(c=>`<a class="chip" href="#/search?category=${encodeURIComponent(c)}">${c}</a>`).join('')}</div>
 <h2>${t('products')} · ${t('popular')} <a href="#/search?type=products">→</a></h2>${grid(p.items,'products')}
 <h2>${t('services')} <a href="#/search?type=services">→</a></h2>${grid(s.items,'services')}
 <h2>${t('businesses')} <a href="#/search?type=businesses">→</a></h2>${grid(b.items,'businesses')}`;
 $('#sf').onsubmit=e=>{e.preventDefault();location.hash='#/search?q='+encodeURIComponent($('#q').value)};}

async function searchView(qs){
 const P=new URLSearchParams(qs),type=P.get('type')||'products';
 app.innerHTML=`<div class="chips">${Object.keys(TYPES).map(x=>`<span class="chip ${x===type?'on':''}" data-t="${x}">${TYPES[x]} ${t(x)}</span>`).join('')}</div>
 <form id="f" class="box"><input name="q" placeholder="${t('ph')}" value="${esc(P.get('q')||'')}">
 <div class="row"><select name="category"><option value="">${t('all')}</option>${opts(CATS,P.get('category'))}</select><select name="country"><option value="">Pays</option>${opts(COUNTRIES,P.get('country'))}</select></div>
 <div class="row"><input name="city" placeholder="Ville" value="${esc(P.get('city')||'')}"><input name="min" type="number" placeholder="Prix min"><input name="max" type="number" placeholder="Prix max"></div>
 <div class="row"><select name="sort"><option value="">Plus récent</option><option value="price_asc">Prix ↑</option><option value="price_desc">Prix ↓</option></select><button class="btn">Filtrer</button></div></form><div id="res"></div><button id="more" class="btn s" style="width:100%;display:none">Plus</button>`;
 document.querySelectorAll('[data-t]').forEach(c=>c.onclick=()=>{P.set('type',c.dataset.t);location.hash='#/search?'+P});
 let page=1;const run=async(reset)=>{const F=new URLSearchParams(new FormData($('#f')));[...F.keys()].forEach(k=>!F.get(k)&&F.delete(k));F.set('page',page);
  const r=await API.get(`/${type}?${F}`);$('#res').insertAdjacentHTML('beforeend',reset&&!r.items.length?'<div class="empty">Aucun résultat.</div>':'');
  if(reset)$('#res').innerHTML='';const g=document.createElement('div');g.className='grid';g.innerHTML=r.items.map(i=>card(i,type)).join('');$('#res').appendChild(g);
  if(reset&&!r.items.length)$('#res').innerHTML='<div class="empty">Aucun résultat.</div>';$('#more').style.display=r.items.length>=20?'block':'none';};
 $('#f').onsubmit=e=>{e.preventDefault();page=1;run(true).catch(x=>toast(x.message))};$('#more').onclick=()=>{page++;run(false)};
 P.forEach((v,k)=>{const el=$('#f').elements[k];if(el&&k!=='type')el.value=v});await run(true);}

async function detail(type,id){
 const it=await API.get(`/${type}/${id}`),me=API.user(),mine=me&&me.id===it.user_id,k=type+':'+id,ph=it.photos||[];
 const wa=(it.whatsapp||it.seller_whatsapp||'').replace(/\D/g,'');
 app.innerHTML=`${ph[0]?`<img class="hero" src="${esc(ph[0])}">`:''}<div class="box"><h2 style="margin-top:0">${esc(it.title)}</h2>
 ${type!=='businesses'&&it.price!=null?`<div class="price" style="font-size:20px">${money(it.price,it.currency)}</div>`:''}
 <p class="mut">${esc(it.category)} · ${esc([it.city,it.country].filter(Boolean).join(', '))} · ${ago(it.created_at)} ${stars(it.rating)}</p>
 <p style="white-space:pre-wrap">${esc(it.description)}</p>
 ${[['quantity','Quantité'],['condition','État'],['availability','Disponibilité'],['address','Adresse'],['website','Site'],['hours','Horaires'],['phone','Tél']].filter(([f])=>it[f]).map(([f,l])=>`<p class="mut">${l}: ${esc(it[f])}</p>`).join('')}
 <a href="#/profile/${it.user_id}" class="li"><div class="av">👤</div><div><b>${esc(it.seller_name)}</b><div class="mut">${stars(it.rating)}</div></div></a>
 <div class="row">${mine?`<button class="btn s" id="del">Supprimer</button>`:`<a class="btn" href="#/chat/${it.user_id}">✉️ Contacter</a>${wa?`<a class="btn w" target="_blank" rel="noopener" href="https://wa.me/${wa}">WhatsApp</a>`:''}`}
 <button class="btn s" data-f="${k}">${favs.has(k)?'❤️':'🤍'} Favori</button><button class="btn s" id="sh">Partager</button></div>
 ${mine?'':'<p><a href="#" id="rp" class="mut">Signaler</a></p>'}</div>
 ${mine?'':`<div class="box"><b>Laisser une évaluation</b><form id="rv"><select name="rating">${[5,4,3,2,1].map(n=>`<option>${n}</option>`).join('')}</select><textarea name="comment" placeholder="Commentaire"></textarea><button class="btn">Envoyer</button></form></div>`}
 <div class="box"><b>Évaluations</b>${it.reviews.map(r=>`<div class="li"><div><b>${esc(r.author)}</b> <span class="star">${'★'.repeat(r.rating)}</span><div>${esc(r.comment)}</div></div></div>`).join('')||'<div class="empty">Aucune évaluation.</div>'}</div>`;
 $('#sh').onclick=async()=>{const u=location.href;try{navigator.share?await navigator.share({title:it.title,url:u}):(await navigator.clipboard.writeText(u),toast('Lien copié'))}catch{}};
 if($('#del'))$('#del').onclick=async()=>{if(confirm('Supprimer ?')){await API.del(`/${type}/${id}`);location.hash='#/profile'}};
 if($('#rp'))$('#rp').onclick=async e=>{e.preventDefault();if(!need())return;const r=prompt('Motif du signalement ?');if(r)try{await API.post('/reports',{target_type:type,target_id:+id,reason:r});toast('Signalement envoyé.')}catch(x){toast(x.message)}};
 if($('#rv'))$('#rv').onsubmit=async e=>{e.preventDefault();if(!need())return;const f=Object.fromEntries(new FormData(e.target));
  try{await API.post('/reviews',{target_type:type==='products'?'users':type,target_id:type==='products'?it.user_id:+id,rating:+f.rating,comment:f.comment});toast('Merci pour votre avis.');detail(type,id)}catch(x){toast(x.message)}};}

function authView(reg){
 app.innerHTML=`<div class="box"><h2 style="margin-top:0">${reg?'Inscription':t('login')}</h2><form id="af">
 ${reg?`<label>Nom</label><input name="name" required><label>Téléphone</label><input name="phone"><label>WhatsApp</label><input name="whatsapp"><div class="row"><div><label>Pays</label><select name="country">${opts(COUNTRIES)}</select></div><div><label>Ville</label><input name="city"></div></div>`:''}
 <label>Email</label><input name="email" type="email" required><label>Mot de passe (6+)</label><input name="password" type="password" minlength="6" required><br><br>
 <button class="btn" style="width:100%">${reg?'Créer mon compte':t('login')}</button></form>
 <p class="mut"><a href="#/${reg?'login':'register'}">${reg?'Déjà un compte ? Connexion':'Pas de compte ? Inscription'}</a></p></div>`;
 $('#af').onsubmit=async e=>{e.preventDefault();try{const r=await API.post(reg?'/register':'/login',Object.fromEntries(new FormData(e.target)));API.setAuth(r.token,r.user);location.hash='#/';}catch(x){toast(x.message)}};}

function resize(file,max=900){return new Promise((ok,ko)=>{if(!/^image\/(jpeg|png|webp)$/.test(file.type))return ko(new Error('Format invalide (JPG, PNG, WEBP).'));
 const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.8))};img.onerror=()=>ko(new Error('Image illisible.'));img.src=URL.createObjectURL(file)})}

function publishView(){
 if(!need())return;const u=API.user()||{};let type='products';
 const draw=()=>{app.innerHTML=`<div class="chips">${Object.keys(TYPES).map(x=>`<span class="chip ${x===type?'on':''}" data-t="${x}">${TYPES[x]} ${t(x)}</span>`).join('')}</div><div class="box"><form id="pf">
 <label>${type==='businesses'?"Nom de l'entreprise":'Titre'}</label><input name="title" required maxlength="120"><label>Catégorie</label><select name="category">${opts(CATS)}</select>
 <label>Description</label><textarea name="description"></textarea>
 ${type!=='businesses'?`<div class="row"><div><label>Prix</label><input name="price" type="number" step="0.01" min="0" ${type==='products'?'required':''}></div><div><label>Devise</label><select name="currency">${opts(CUR)}</select></div></div>`:''}
 ${type==='products'?`<div class="row"><div><label>Quantité</label><input name="quantity" type="number" min="1" value="1"></div><div><label>État</label><select name="condition"><option>Neuf</option><option>Comme neuf</option><option>Bon état</option><option>Usagé</option></select></div></div><label>Contact</label><input name="contact" value="${esc(u.phone||'')}">`:''}
 ${type==='services'?`<label>Disponibilité</label><input name="availability" placeholder="Lun-Ven 8h-18h"><label>Téléphone</label><input name="phone" value="${esc(u.phone||'')}"><label>WhatsApp</label><input name="whatsapp" value="${esc(u.whatsapp||'')}"><label>Contact préféré</label><select name="contact_method"><option value="whatsapp">WhatsApp</option><option value="phone">Téléphone</option><option value="message">Messages HELPY</option></select>`:''}
 ${type==='businesses'?`<label>Téléphone</label><input name="phone"><label>WhatsApp</label><input name="whatsapp"><label>Adresse</label><input name="address"><label>Site web</label><input name="website"><label>Horaires</label><input name="hours"><label>Réseaux sociaux</label><input name="socials">`:''}
 <div class="row"><div><label>Pays</label><select name="country">${opts(COUNTRIES,u.country)}</select></div><div><label>Ville</label><input name="city" value="${esc(u.city||'')}"></div></div>
 <label>Photos (max 5)</label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple><br><br><button class="btn" style="width:100%">Publier</button></form></div>`;
 document.querySelectorAll('[data-t]').forEach(c=>c.onclick=()=>{type=c.dataset.t;draw()});
 $('#pf').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('.btn');btn.disabled=true;
  try{const b=Object.fromEntries(new FormData(e.target));b.photos=await Promise.all([...$('#ph').files].slice(0,5).map(f=>resize(f)));
   const r=await API.post('/'+type,b);toast(r.status==='published'?'Votre publication a été créée.':'Publication en cours de vérification.');location.hash=`#/item/${type}/${r.id}`;}
  catch(x){toast(x.message);btn.disabled=false}}};draw();}

async function favView(){if(!need())return;const f=await API.get('/favorites');let flt='';
 const draw=()=>{app.innerHTML=`<div class="chips"><span class="chip ${!flt?'on':''}" data-t="">${t('all')}</span>${Object.keys(TYPES).map(x=>`<span class="chip ${flt===x?'on':''}" data-t="${x}">${t(x)}</span>`).join('')}</div>${grid(f.filter(i=>!flt||i.item_type===flt))}`;
  document.querySelectorAll('[data-t]').forEach(c=>c.onclick=()=>{flt=c.dataset.t;draw()})};draw();}

async function msgList(){if(!need())return;const l=await API.get('/messages');
 app.innerHTML=`<h2>Messages</h2>${l.map(c=>`<a class="li" href="#/chat/${c.user_id}"><div class="av" style="${c.photo?`background-image:url('${esc(c.photo)}')`:''}">${c.photo?'':'👤'}</div><div style="flex:1"><b>${esc(c.name)}</b><div class="mut">${esc(c.body).slice(0,60)}</div></div>${+c.unread?`<span class="badge" style="position:static">${c.unread}</span>`:''}</a>`).join('')||'<div class="empty">Aucune conversation.</div>'}`;}
async function chat(id){if(!need())return;const me=API.user();let box;
 const load=async()=>{const m=await API.get('/messages?with='+id);box.innerHTML=m.map(x=>`<div class="msg ${x.sender_id===me.id?'me':''}">${esc(x.body)}<div class="mut" style="color:inherit;opacity:.7">${new Date(x.created_at).toLocaleString()}</div></div>`).join('')||'<div class="empty">Écrivez le premier message.</div>';window.scrollTo(0,document.body.scrollHeight)};
 app.innerHTML=`<a href="#/messages">← Messages</a><div id="cb"></div><form id="mf" class="search" style="position:sticky;bottom:80px"><input name="body" required autocomplete="off" placeholder="Message…"><button class="btn">➤</button></form>`;box=$('#cb');
 $('#mf').onsubmit=async e=>{e.preventDefault();try{await API.post('/messages',{receiver_id:+id,body:e.target.body.value});e.target.reset();load()}catch(x){toast(x.message)}};
 await load();const iv=setInterval(()=>{if(!location.hash.startsWith('#/chat/'))clearInterval(iv);else load().catch(()=>{})},8000);}
async function notifs(){if(!need())return;const l=await API.get('/notifications');app.innerHTML=`<h2>Notifications</h2>${l.map(n=>`<div class="li"><div>${esc(n.body)}<div class="mut">${new Date(n.created_at).toLocaleString()}</div></div></div>`).join('')||'<div class="empty">Aucune notification.</div>'}`;refreshChrome();}

async function profile(id){
 const me=API.user();if(!id){if(!need())return;id=me.id}const u=await API.get('/users/'+id),own=me&&me.id===+id;
 app.innerHTML=`<div class="box"><div class="li" style="border:0"><div class="av" style="width:72px;height:72px;${u.photo?`background-image:url('${esc(u.photo)}')`:''}">${u.photo?'':'👤'}</div><div><h2 style="margin:0">${esc(u.name)}</h2><div class="mut">${esc([u.city,u.country].filter(Boolean).join(', '))} · depuis ${ago(u.created_at)} ${stars(u.rating)}</div></div></div>
 <p>${esc(u.bio)}</p><p class="mut">${esc(u.phone)} ${esc(u.whatsapp?'· WhatsApp '+u.whatsapp:'')}</p>
 <div class="row">${own?`<a class="btn s" href="#/edit-profile">Modifier</a><button class="btn s" id="lo">${t('logout')}</button>`:`<a class="btn" href="#/chat/${u.id}">✉️ Contacter</a>`}</div></div>
 ${['products','services','businesses'].map(x=>u[x].length?`<h2>${t(x)}</h2>${grid(u[x],x)}`:'').join('')}`;
 if($('#lo'))$('#lo').onclick=()=>{API.logout();refreshChrome();location.hash='#/login'};}
function editProfile(){if(!need())return;const u=API.user();let photo=null;
 app.innerHTML=`<div class="box"><form id="ef"><label>Nom</label><input name="name" value="${esc(u.name)}" required><label>Bio</label><textarea name="bio">${esc(u.bio)}</textarea><label>Téléphone</label><input name="phone" value="${esc(u.phone)}"><label>WhatsApp</label><input name="whatsapp" value="${esc(u.whatsapp)}">
 <div class="row"><div><label>Pays</label><select name="country">${opts(COUNTRIES,u.country)}</select></div><div><label>Ville</label><input name="city" value="${esc(u.city)}"></div></div>
 <label>Photo</label><input type="file" id="pp" accept="image/jpeg,image/png,image/webp"><br><br><button class="btn" style="width:100%">Enregistrer</button></form></div>`;
 $('#pp').onchange=async e=>{try{photo=await resize(e.target.files[0],400)}catch(x){toast(x.message)}};
 $('#ef').onsubmit=async e=>{e.preventDefault();try{const b=Object.fromEntries(new FormData(e.target));if(photo)b.photo=photo;const r=await API.put('/users/'+u.id,b);API.setAuth(API.token(),r);toast('Profil mis à jour.');location.hash='#/profile'}catch(x){toast(x.message)}};}

async function route(){
 const[p,qs]=(location.hash||'#/').slice(1).split('?'),s=p.split('/').filter(Boolean);
 try{if(!s.length)await home();else if(s[0]==='search')await searchView(qs);else if(s[0]==='item')await detail(s[1],s[2]);else if(s[0]==='login')authView(false);else if(s[0]==='register')authView(true);
  else if(s[0]==='publish')publishView();else if(s[0]==='favorites')await favView();else if(s[0]==='messages')await msgList();else if(s[0]==='chat')await chat(s[1]);
  else if(s[0]==='notifications')await notifs();else if(s[0]==='profile')await profile(s[1]);else if(s[0]==='edit-profile')editProfile();else await home();}
 catch(e){app.innerHTML=`<div class="empty">${esc(e.message)}</div>`}
 window.scrollTo(0,0);}
window.addEventListener('hashchange',()=>{route();refreshChrome()});
refreshChrome().then(route);
