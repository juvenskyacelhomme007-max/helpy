const express=require('express'),path=require('path'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),{Pool}=require('pg');
const {DATABASE_URL,JWT_SECRET,PORT=3000,PGSSL}=process.env;
if(!DATABASE_URL||!JWT_SECRET){console.error('DATABASE_URL et JWT_SECRET sont requis');process.exit(1);}
const pool=new Pool({connectionString:DATABASE_URL,ssl:PGSSL==='true'?{rejectUnauthorized:false}:false});
const q=(t,p)=>pool.query(t,p);
const app=express();app.use(express.json({limit:'6mb'}));app.use(express.static(path.join(__dirname,'public')));
const wrap=f=>(a,b,c)=>f(a,b,c).catch(e=>{console.error(e);b.status(500).json({error:'Une erreur est survenue.'})});
const bad=(r,m,s=400)=>r.status(s).json({error:m});
const auth=(req,res,next)=>{try{req.uid=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),JWT_SECRET).id;next();}catch{bad(res,'Vous devez être connecté pour continuer.',401);}};
const optAuth=(req,res,next)=>{try{req.uid=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),JWT_SECRET).id;}catch{}next();};
const tok=id=>jwt.sign({id},JWT_SECRET,{expiresIn:'30d'});
const pub=u=>{const{password_hash,...r}=u;return r;};
const notify=(uid,type,text)=>q('INSERT INTO notifications(user_id,type,body) VALUES($1,$2,$3)',[uid,type,text]).catch(()=>{});

const SCHEMA=`
CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,phone TEXT,whatsapp TEXT,country TEXT,city TEXT,bio TEXT,photo TEXT,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS products(id SERIAL PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,category TEXT NOT NULL,description TEXT,price NUMERIC(14,2),currency TEXT DEFAULT 'USD',photos JSONB DEFAULT '[]',country TEXT,city TEXT,quantity INT DEFAULT 1,condition TEXT,contact TEXT,status TEXT DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS services(id SERIAL PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,category TEXT NOT NULL,description TEXT,price NUMERIC(14,2),currency TEXT DEFAULT 'USD',photos JSONB DEFAULT '[]',country TEXT,city TEXT,whatsapp TEXT,phone TEXT,availability TEXT,contact_method TEXT,status TEXT DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS businesses(id SERIAL PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,category TEXT NOT NULL,description TEXT,photos JSONB DEFAULT '[]',phone TEXT,whatsapp TEXT,country TEXT,city TEXT,address TEXT,website TEXT,hours TEXT,socials TEXT,status TEXT DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS favorites(id SERIAL PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,item_type TEXT NOT NULL CHECK(item_type IN('products','services','businesses')),item_id INT NOT NULL,created_at TIMESTAMPTZ DEFAULT now(),UNIQUE(user_id,item_type,item_id));
CREATE TABLE IF NOT EXISTS messages(id SERIAL PRIMARY KEY,sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,body TEXT NOT NULL,is_read BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS reviews(id SERIAL PRIMARY KEY,author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,target_type TEXT NOT NULL CHECK(target_type IN('users','services','businesses')),target_id INT NOT NULL,rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT,created_at TIMESTAMPTZ DEFAULT now(),UNIQUE(author_id,target_type,target_id));
CREATE TABLE IF NOT EXISTS notifications(id SERIAL PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,type TEXT,body TEXT,is_read BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS reports(id SERIAL PRIMARY KEY,reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,target_type TEXT NOT NULL,target_id INT NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX IF NOT EXISTS i_p ON products(status,category,country,city,created_at DESC);
CREATE INDEX IF NOT EXISTS i_s ON services(status,category,country,city,created_at DESC);
CREATE INDEX IF NOT EXISTS i_b ON businesses(status,category,country,city,created_at DESC);
CREATE INDEX IF NOT EXISTS i_m ON messages(receiver_id,is_read);`;

// Auth
app.post('/api/register',wrap(async(req,res)=>{
 const{name,email,password,phone,whatsapp,country,city}=req.body;
 if(!name||!/^\S+@\S+\.\S+$/.test(email||'')||(password||'').length<6)return bad(res,'Veuillez vérifier vos informations.');
 const h=await bcrypt.hash(password,10);
 try{const r=await q('INSERT INTO users(name,email,password_hash,phone,whatsapp,country,city) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[name.trim(),email.toLowerCase(),h,phone,whatsapp,country,city]);
  res.json({token:tok(r.rows[0].id),user:pub(r.rows[0])});}
 catch(e){if(e.code==='23505')return bad(res,'Cet email est déjà utilisé.',409);throw e;}}));
app.post('/api/login',wrap(async(req,res)=>{
 const r=await q('SELECT * FROM users WHERE email=$1',[(req.body.email||'').toLowerCase()]);const u=r.rows[0];
 if(!u||!(await bcrypt.compare(req.body.password||'',u.password_hash)))return bad(res,'Email ou mot de passe incorrect.',401);
 res.json({token:tok(u.id),user:pub(u)});}));
app.get('/api/me',auth,wrap(async(req,res)=>{const r=await q('SELECT * FROM users WHERE id=$1',[req.uid]);r.rows[0]?res.json(pub(r.rows[0])):bad(res,'Introuvable',404);}));
const rate=(t,i)=>`(SELECT COALESCE(ROUND(AVG(rating),1),0) FROM reviews WHERE target_type='${t}' AND target_id=${i}) AS rating,(SELECT COUNT(*) FROM reviews WHERE target_type='${t}' AND target_id=${i}) AS reviews_count`;
app.get('/api/users/:id',wrap(async(req,res)=>{
 const r=await q(`SELECT id,name,phone,whatsapp,country,city,bio,photo,created_at,${rate('users','users.id')} FROM users WHERE id=$1`,[req.params.id]);
 if(!r.rows[0])return bad(res,'Introuvable',404);const id=req.params.id,o=r.rows[0];
 for(const t of['products','services','businesses'])o[t]=(await q(`SELECT * FROM ${t} WHERE user_id=$1 AND status='published' ORDER BY created_at DESC LIMIT 50`,[id])).rows;
 o.reviews=(await q(`SELECT r.*,u.name author FROM reviews r JOIN users u ON u.id=r.author_id WHERE target_type='users' AND target_id=$1 ORDER BY r.created_at DESC LIMIT 30`,[id])).rows;
 res.json(o);}));
app.put('/api/users/:id',auth,wrap(async(req,res)=>{
 if(+req.params.id!==req.uid)return bad(res,'Action non autorisée.',403);
 const b=req.body;if(b.photo&&!/^data:image\/(jpeg|png|webp);base64,/.test(b.photo))return bad(res,'Format de photo invalide (JPG, PNG, WEBP).');
 const r=await q('UPDATE users SET name=COALESCE($1,name),bio=$2,phone=$3,whatsapp=$4,country=$5,city=$6,photo=COALESCE($7,photo) WHERE id=$8 RETURNING *',[b.name,b.bio,b.phone,b.whatsapp,b.country,b.city,b.photo,req.uid]);
 res.json(pub(r.rows[0]));}));

// Moderation
const BANNED=/\b(arme à feu|cocaïne|héroïne|weapon|cocaine|escort|porn|viagra)\b/i,SPAM=/(https?:\/\/\S+.*){3,}|(.)\2{9,}|gagnez \$?\d+|click here|bit\.ly/i;
async function moderate(t,b,uid){
 const txt=`${b.title} ${b.description||''}`;
 if(BANNED.test(txt)||SPAM.test(txt))return'pending_review';
 if(b.price!==undefined&&b.price!==''&&(+b.price<0||+b.price>1e9))return'pending_review';
 const d=await q(`SELECT 1 FROM ${t} WHERE user_id=$1 AND lower(title)=lower($2) AND created_at>now()-interval '7 days' LIMIT 1`,[uid,b.title]);
 return d.rowCount?'pending_review':'published';}

// Listings
const T={
 products:['title','category','description','price','currency','photos','country','city','quantity','condition','contact'],
 services:['title','category','description','price','currency','photos','country','city','whatsapp','phone','availability','contact_method'],
 businesses:['title','category','description','photos','phone','whatsapp','country','city','address','website','hours','socials']};
const PH=/^data:image\/(jpeg|png|webp);base64,/;
function clean(t,b){
 const o={};for(const c of T[t])if(b[c]!==undefined)o[c]=b[c];
 if(o.photos!==undefined){const a=Array.isArray(o.photos)?o.photos.slice(0,5):[];if(a.some(p=>typeof p!=='string'||!(PH.test(p)||/^https?:\/\//.test(p))))return{err:'Photo invalide (JPG, PNG, WEBP).'};o.photos=JSON.stringify(a);}
 for(const c of Object.keys(o))if(typeof o[c]==='string')o[c]=o[c].slice(0,c==='description'?4000:300);
 if(o.price===''||o.price===null)delete o.price;
 return{o};}
for(const t of Object.keys(T)){
 app.get(`/api/${t}`,wrap(async(req,res)=>{
  const Q=req.query,w=["x.status='published'"],p=[];
  const add=(s,v)=>{p.push(v);w.push(s.replace(/\?/g,'$'+p.length));};
  if(Q.q)add("(x.title ILIKE ? OR x.description ILIKE ?)",'%'+Q.q+'%');
  if(Q.category)add('x.category=?',Q.category);if(Q.country)add('x.country=?',Q.country);if(Q.city)add('x.city ILIKE ?',Q.city);
  if(Q.user)add('x.user_id=?',+Q.user);
  if(t!=='businesses'){if(Q.min)add('x.price>=?',+Q.min);if(Q.max)add('x.price<=?',+Q.max);}
  const order=Q.sort==='price_asc'&&t!=='businesses'?'x.price ASC NULLS LAST':Q.sort==='price_desc'&&t!=='businesses'?'x.price DESC NULLS LAST':'x.created_at DESC';
  const lim=Math.min(+Q.limit||20,50),off=((+Q.page||1)-1)*lim;
  const r=await q(`SELECT x.*,u.name seller_name,${t==='products'?"0 AS rating":rate(t,'x.id')} FROM ${t} x JOIN users u ON u.id=x.user_id WHERE ${w.join(' AND ')} ORDER BY ${order} LIMIT ${lim} OFFSET ${off}`,p);
  res.json({items:r.rows,page:+Q.page||1});}));
 app.get(`/api/${t}/:id`,optAuth,wrap(async(req,res)=>{
  const r=await q(`SELECT x.*,u.name seller_name,u.photo seller_photo,u.phone seller_phone,u.whatsapp seller_whatsapp,${rate(t==='products'?'users':t,t==='products'?'x.user_id':'x.id')} FROM ${t} x JOIN users u ON u.id=x.user_id WHERE x.id=$1`,[req.params.id]);
  const it=r.rows[0];if(!it||(it.status!=='published'&&it.user_id!==req.uid))return bad(res,'Introuvable',404);
  it.reviews=(await q(`SELECT r.rating,r.comment,r.created_at,u.name author FROM reviews r JOIN users u ON u.id=r.author_id WHERE target_type=$1 AND target_id=$2 ORDER BY r.created_at DESC LIMIT 30`,[t==='products'?'users':t,t==='products'?it.user_id:it.id])).rows;
  res.json(it);}));
 app.post(`/api/${t}`,auth,wrap(async(req,res)=>{
  const{o,err}=clean(t,req.body);if(err)return bad(res,err);
  if(!o.title||!o.category||(t==='products'&&(o.price===undefined||isNaN(+o.price)))||(t==='services'&&o.contact_method==='whatsapp'&&!o.whatsapp))return bad(res,'Veuillez vérifier vos informations.');
  const status=await moderate(t,o,req.uid);const cols=['user_id','status',...Object.keys(o)],vals=[req.uid,status,...Object.values(o)];
  const r=await q(`INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map((_,i)=>'$'+(i+1))}) RETURNING *`,vals);
  notify(req.uid,status==='published'?'published':'pending',status==='published'?'Votre publication est en ligne : '+o.title:'Votre publication est en cours de vérification : '+o.title);
  res.status(201).json(r.rows[0]);}));
 app.put(`/api/${t}/:id`,auth,wrap(async(req,res)=>{
  const{o,err}=clean(t,req.body);if(err)return bad(res,err);const k=Object.keys(o);if(!k.length)return bad(res,'Aucune modification.');
  const r=await q(`UPDATE ${t} SET ${k.map((c,i)=>c+'=$'+(i+1))} WHERE id=$${k.length+1} AND user_id=$${k.length+2} RETURNING *`,[...Object.values(o),req.params.id,req.uid]);
  r.rows[0]?res.json(r.rows[0]):bad(res,'Action non autorisée.',403);}));
 app.delete(`/api/${t}/:id`,auth,wrap(async(req,res)=>{
  const r=await q(`DELETE FROM ${t} WHERE id=$1 AND user_id=$2`,[req.params.id,req.uid]);
  if(!r.rowCount)return bad(res,'Action non autorisée.',403);
  await q('DELETE FROM favorites WHERE item_type=$1 AND item_id=$2',[t,req.params.id]);res.json({ok:true});}));}

// Favorites
app.get('/api/favorites',auth,wrap(async(req,res)=>{
 const out=[];const f=(await q('SELECT * FROM favorites WHERE user_id=$1 ORDER BY created_at DESC',[req.uid])).rows;
 for(const t of Object.keys(T)){const ids=f.filter(x=>x.item_type===t).map(x=>x.item_id);
  if(ids.length)(await q(`SELECT * FROM ${t} WHERE id=ANY($1) AND status='published'`,[ids])).rows.forEach(r=>out.push({...r,item_type:t}));}
 res.json(out);}));
app.post('/api/favorites',auth,wrap(async(req,res)=>{
 const{item_type,item_id}=req.body;if(!T[item_type]||!item_id)return bad(res,'Veuillez vérifier vos informations.');
 const it=(await q(`SELECT user_id,title FROM ${item_type} WHERE id=$1`,[item_id])).rows[0];if(!it)return bad(res,'Introuvable',404);
 const r=await q('INSERT INTO favorites(user_id,item_type,item_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[req.uid,item_type,item_id]);
 if(r.rowCount&&it.user_id!==req.uid)notify(it.user_id,'favorite','Votre publication a été ajoutée aux favoris : '+it.title);
 res.json({ok:true});}));
app.delete('/api/favorites/:type/:id',auth,wrap(async(req,res)=>{await q('DELETE FROM favorites WHERE user_id=$1 AND item_type=$2 AND item_id=$3',[req.uid,req.params.type,req.params.id]);res.json({ok:true});}));
app.get('/api/favorites/ids',auth,wrap(async(req,res)=>res.json((await q('SELECT item_type,item_id FROM favorites WHERE user_id=$1',[req.uid])).rows)));

// Messages
app.get('/api/messages',auth,wrap(async(req,res)=>{
 if(req.query.with){const o=+req.query.with;
  const r=await q('SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at ASC LIMIT 200',[req.uid,o]);
  await q('UPDATE messages SET is_read=true WHERE receiver_id=$1 AND sender_id=$2 AND NOT is_read',[req.uid,o]);return res.json(r.rows);}
 const r=await q(`SELECT DISTINCT ON(o.id) o.id user_id,o.name,o.photo,m.body,m.created_at,(SELECT COUNT(*) FROM messages WHERE sender_id=o.id AND receiver_id=$1 AND NOT is_read) unread
  FROM messages m JOIN users o ON o.id=CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END WHERE m.sender_id=$1 OR m.receiver_id=$1 ORDER BY o.id,m.created_at DESC`,[req.uid]);
 res.json(r.rows.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)));}));
app.post('/api/messages',auth,wrap(async(req,res)=>{
 const{receiver_id,body}=req.body;if(!receiver_id||!(body||'').trim()||+receiver_id===req.uid)return bad(res,'Veuillez vérifier vos informations.');
 if((await q('SELECT 1 FROM users WHERE id=$1',[receiver_id])).rowCount===0)return bad(res,'Utilisateur introuvable.',404);
 const r=await q('INSERT INTO messages(sender_id,receiver_id,body) VALUES($1,$2,$3) RETURNING *',[req.uid,receiver_id,body.trim().slice(0,2000)]);
 notify(receiver_id,'message','Nouveau message reçu');res.status(201).json(r.rows[0]);}));

// Reviews
app.get('/api/reviews',wrap(async(req,res)=>{const r=await q(`SELECT r.*,u.name author FROM reviews r JOIN users u ON u.id=r.author_id WHERE target_type=$1 AND target_id=$2 ORDER BY r.created_at DESC LIMIT 50`,[req.query.target_type,req.query.target_id]);res.json(r.rows);}));
app.post('/api/reviews',auth,wrap(async(req,res)=>{
 const{target_type,target_id,rating,comment}=req.body;
 if(!['users','services','businesses'].includes(target_type)||!(rating>=1&&rating<=5))return bad(res,'Veuillez vérifier vos informations.');
 const owner=target_type==='users'?target_id:(await q(`SELECT user_id FROM ${target_type} WHERE id=$1`,[target_id])).rows[0]?.user_id;
 if(!owner)return bad(res,'Introuvable',404);if(+owner===req.uid)return bad(res,'Vous ne pouvez pas vous évaluer vous-même.');
 try{await q('INSERT INTO reviews(author_id,target_type,target_id,rating,comment) VALUES($1,$2,$3,$4,$5)',[req.uid,target_type,target_id,Math.round(rating),(comment||'').slice(0,1000)]);}
 catch(e){if(e.code==='23505')return bad(res,'Vous avez déjà laissé un avis.',409);throw e;}
 notify(owner,'review','Vous avez reçu une nouvelle évaluation ('+Math.round(rating)+'/5)');res.status(201).json({ok:true});}));

// Notifications & reports
app.get('/api/notifications',auth,wrap(async(req,res)=>{const r=await q('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[req.uid]);await q('UPDATE notifications SET is_read=true WHERE user_id=$1',[req.uid]);res.json(r.rows);}));
app.get('/api/counts',auth,wrap(async(req,res)=>{const a=await q('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND NOT is_read',[req.uid]),b=await q('SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND NOT is_read',[req.uid]);res.json({notifications:+a.rows[0].count,messages:+b.rows[0].count});}));
app.post('/api/reports',auth,wrap(async(req,res)=>{
 const{target_type,target_id,reason}=req.body;if(!['users','products','services','businesses'].includes(target_type)||!target_id||!(reason||'').trim())return bad(res,'Veuillez vérifier vos informations.');
 await q('INSERT INTO reports(reporter_id,target_type,target_id,reason) VALUES($1,$2,$3,$4)',[req.uid,target_type,target_id,reason.slice(0,500)]);res.status(201).json({ok:true});}));

app.get('/api/health',async(req,res)=>{try{await q('SELECT 1');res.json({status:'ok',service:'HELPY',database:'connected'});}catch{res.status(503).json({status:'error',service:'HELPY',database:'disconnected'});}});
app.use('/api',(req,res)=>bad(res,'Route introuvable',404));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((e,req,res,next)=>{console.error(e);bad(res,'Une erreur est survenue.',500);});
q(SCHEMA).then(()=>app.listen(PORT,()=>console.log('HELPY sur le port '+PORT))).catch(e=>{console.error('Erreur base de données:',e.message);process.exit(1);});
