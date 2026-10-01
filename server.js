const express=require("express");
const path=require("path");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const {Pool}=require("pg");

const {DATABASE_URL,JWT_SECRET,PORT=3000,PGSSL}=process.env;
if(!DATABASE_URL||!JWT_SECRET){console.error("DATABASE_URL et JWT_SECRET sont requis");process.exit(1);}
const pool=new Pool({connectionString:DATABASE_URL,ssl:PGSSL==="true"?{rejectUnauthorized:false}:false});
const app=express();
app.use(express.json({limit:"25mb"}));
app.use(express.urlencoded({extended:true,limit:"25mb"}));
app.use(express.static(__dirname));

const q=(text,params=[])=>pool.query(text,params);
const ok=(data={})=>({statut:"ok",...data});
const bad=(res,message,status=400)=>res.status(status).json({statut:"erreur",message});
const clean=(v,max=10000)=>v==null?null:String(v).trim().slice(0,max);
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const arr=v=>Array.isArray(v)?v:(v?[v]:[]);
const photos=v=>arr(v).map(String).map(x=>x.trim()).filter(Boolean).slice(0,20);
const token=u=>jwt.sign({id:u.id,email:u.email},JWT_SECRET,{expiresIn:"30d"});

function auth(req,res,next){
 const h=req.headers.authorization||"",t=h.startsWith("Bearer ")?h.slice(7):null;
 if(!t)return bad(res,"Authentification requise.",401);
 try{req.user=jwt.verify(t,JWT_SECRET);next();}catch{return bad(res,"Session invalide ou expirée.",401);}
}
function optAuth(req,res,next){
 const h=req.headers.authorization||"",t=h.startsWith("Bearer ")?h.slice(7):null;
 req.user=null;if(t)try{req.user=jwt.verify(t,JWT_SECRET)}catch{}next();
}
function moderate(v){
 const x=String(v||"").toLowerCase();
 if(["arme","armes","drogue","drogues","contrefaçon","contrefacon"].some(w=>x.includes(w)))
   return {status:"review"};
 return {status:"published"};
}
async function notify(uid,type,title,body,target_type=null,target_id=null){
 if(!uid)return;
 await q(`INSERT INTO notifications(user_id,type,title,body,target_type,target_id,is_read,created_at)
 VALUES($1,$2,$3,$4,$5,$6,false,NOW())`,[uid,type,clean(title,255),clean(body,2000),target_type,target_id]);
}
async function schema(){
 await q(`
 CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,phone TEXT,whatsapp TEXT,country TEXT,city TEXT,bio TEXT,photo TEXT,status TEXT DEFAULT 'active',verified BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS products(id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,category TEXT,description TEXT,price NUMERIC DEFAULT 0,currency TEXT DEFAULT 'USD',photos JSONB DEFAULT '[]'::jsonb,country TEXT,city TEXT,quantity INTEGER DEFAULT 1,condition TEXT,contact TEXT,status TEXT DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS services(id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,category TEXT,description TEXT,price NUMERIC DEFAULT 0,currency TEXT DEFAULT 'USD',photos JSONB DEFAULT '[]'::jsonb,country TEXT,city TEXT,whatsapp TEXT,phone TEXT,availability TEXT,contact_method TEXT,status TEXT DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS businesses(id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,category TEXT,description TEXT,photos JSONB DEFAULT '[]'::jsonb,phone TEXT,whatsapp TEXT,country TEXT,city TEXT,address TEXT,website TEXT,hours TEXT,socials JSONB DEFAULT '{}'::jsonb,status TEXT DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS favorites(id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,item_type TEXT NOT NULL,item_id INTEGER NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(user_id,item_type,item_id));
 CREATE TABLE IF NOT EXISTS messages(id SERIAL PRIMARY KEY,sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,body TEXT NOT NULL,is_read BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS reviews(id SERIAL PRIMARY KEY,reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,target_type TEXT NOT NULL,target_id INTEGER NOT NULL,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(reviewer_id,target_type,target_id));
 CREATE TABLE IF NOT EXISTS notifications(id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,type TEXT,title TEXT,body TEXT,target_type TEXT,target_id INTEGER,is_read BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS reports(id SERIAL PRIMARY KEY,reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,target_type TEXT NOT NULL,target_id INTEGER NOT NULL,reason TEXT NOT NULL,details TEXT,status TEXT DEFAULT 'open',created_at TIMESTAMPTZ DEFAULT NOW());
 `);
 const m=[
 ["users","phone","TEXT"],["users","whatsapp","TEXT"],["users","country","TEXT"],["users","city","TEXT"],["users","bio","TEXT"],["users","photo","TEXT"],["users","status","TEXT DEFAULT 'active'"],["users","verified","BOOLEAN DEFAULT false"],
 ["products","photos","JSONB DEFAULT '[]'::jsonb"],["products","country","TEXT"],["products","city","TEXT"],["products","quantity","INTEGER DEFAULT 1"],["products","condition","TEXT"],["products","contact","TEXT"],["products","status","TEXT DEFAULT 'published'"],
 ["services","photos","JSONB DEFAULT '[]'::jsonb"],["services","country","TEXT"],["services","city","TEXT"],["services","whatsapp","TEXT"],["services","phone","TEXT"],["services","availability","TEXT"],["services","contact_method","TEXT"],["services","status","TEXT DEFAULT 'published'"],
 ["businesses","photos","JSONB DEFAULT '[]'::jsonb"],["businesses","phone","TEXT"],["businesses","whatsapp","TEXT"],["businesses","country","TEXT"],["businesses","city","TEXT"],["businesses","address","TEXT"],["businesses","website","TEXT"],["businesses","hours","TEXT"],["businesses","socials","JSONB DEFAULT '{}'::jsonb"],["businesses","status","TEXT DEFAULT 'published'"]];
 for(const [t,c,d] of m)await q(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ${c} ${d}`);
}

app.get("/api/health",async(req,res)=>{try{await q("SELECT 1");res.json(ok({status:"ok",service:"HELPY",database:"connected"}))}catch(e){res.status(500).json({statut:"erreur",status:"error",service:"HELPY",database:"disconnected",message:e.message})}});

app.post("/api/register",async(req,res)=>{try{
 const name=clean(req.body.name,120),email=clean(req.body.email,255)?.toLowerCase(),password=String(req.body.password||"");
 if(!name||!email||password.length<6)return bad(res,"Nom, email et mot de passe d'au moins 6 caractères requis.");
 if((await q("SELECT id FROM users WHERE lower(email)=lower($1)",[email])).rows.length)return bad(res,"Cet email est déjà utilisé.",409);
 const h=await bcrypt.hash(password,12),r=await q(`INSERT INTO users(name,email,password_hash,phone,whatsapp,country,city,bio,photo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,name,email,phone,whatsapp,country,city,bio,photo,status,verified,created_at`,
 [name,email,h,clean(req.body.phone,50),clean(req.body.whatsapp,50),clean(req.body.country,120),clean(req.body.city,120),clean(req.body.bio,2000),clean(req.body.photo,3000000)]);
 res.status(201).json(ok({token:token(r.rows[0]),user:r.rows[0]}));
}catch(e){console.error(e);bad(res,"Erreur interne lors de l'inscription.",500)}});

app.post("/api/login",async(req,res)=>{try{
 const email=clean(req.body.email,255)?.toLowerCase(),password=String(req.body.password||"");
 const r=await q("SELECT * FROM users WHERE lower(email)=lower($1) LIMIT 1",[email]);
 if(!r.rows.length||!(await bcrypt.compare(password,r.rows[0].password_hash)))return bad(res,"Email ou mot de passe incorrect.",401);
 const u=r.rows[0];if(u.status==="blocked")return bad(res,"Ce compte est bloqué.",403);delete u.password_hash;
 res.json(ok({token:token(u),user:u}));
}catch(e){console.error(e);bad(res,"Erreur interne lors de la connexion.",500)}});

app.get("/api/me",auth,async(req,res)=>{try{const r=await q("SELECT id,name,email,phone,whatsapp,country,city,bio,photo,status,verified,created_at FROM users WHERE id=$1",[req.user.id]);if(!r.rows.length)return bad(res,"Utilisateur introuvable.",404);res.json(ok({user:r.rows[0]}))}catch(e){bad(res,"Erreur interne.",500)}});

app.get("/api/users/:id",async(req,res)=>{try{
 const id=Number(req.params.id),u=(await q("SELECT id,name,email,phone,whatsapp,country,city,bio,photo,status,verified,created_at FROM users WHERE id=$1",[id])).rows[0];
 if(!u)return bad(res,"Utilisateur introuvable.",404);
 const [p,s,b,r,rt]=await Promise.all([
 q("SELECT * FROM products WHERE user_id=$1 ORDER BY created_at DESC",[id]),
 q("SELECT * FROM services WHERE user_id=$1 ORDER BY created_at DESC",[id]),
 q("SELECT * FROM businesses WHERE user_id=$1 ORDER BY created_at DESC",[id]),
 q("SELECT r.*,u.name reviewer_name,u.photo reviewer_photo FROM reviews r LEFT JOIN users u ON u.id=r.reviewer_id WHERE r.target_type='users' AND r.target_id=$1 ORDER BY r.created_at DESC",[id]),
 q("SELECT COALESCE(avg(rating),0) rating,count(*)::int review_count FROM reviews WHERE target_type='users' AND target_id=$1",[id])]);
 u.rating=Number(rt.rows[0]?.rating||0);u.review_count=Number(rt.rows[0]?.review_count||0);
 res.json(ok({user:u,products:p.rows,services:s.rows,businesses:b.rows,reviews:r.rows}));
}catch(e){console.error(e);bad(res,"Erreur interne.",500)}});

app.put("/api/users/:id",auth,async(req,res)=>{try{
 const id=Number(req.params.id);if(id!==Number(req.user.id))return bad(res,"Action non autorisée.",403);
 const allowed=["name","phone","whatsapp","country","city","bio","photo"],sets=[],vals=[];
 for(const f of allowed)if(req.body[f]!==undefined){vals.push(clean(req.body[f],f==="photo"?3000000:f==="bio"?2000:500));sets.push(`${f}=$${vals.length}`)}
 if(!sets.length)return bad(res,"Aucune modification reçue.");vals.push(id);
 const r=await q(`UPDATE users SET ${sets.join(",")},updated_at=NOW() WHERE id=$${vals.length} RETURNING id,name,email,phone,whatsapp,country,city,bio,photo,status,verified,created_at`,vals);
 res.json(ok({user:r.rows[0]}));
}catch(e){console.error(e);bad(res,"Erreur interne.",500)}});

const CFG={
 products:{table:"products",fields:["title","category","description","price","currency","photos","country","city","quantity","condition","contact"]},
 services:{table:"services",fields:["title","category","description","price","currency","photos","country","city","whatsapp","phone","availability","contact_method"]},
 businesses:{table:"businesses",fields:["title","category","description","photos","phone","whatsapp","country","city","address","website","hours","socials"]}
};
function val(f,v){if(f==="photos")return JSON.stringify(photos(v));if(f==="socials"){try{return JSON.stringify(typeof v==="object"?v:JSON.parse(v||"{}"))}catch{return "{}"}}if(f==="price")return num(v,0);if(f==="quantity")return Math.max(0,Math.floor(num(v,1)));return clean(v)}
function parse(x){if(typeof x.photos==="string")try{x.photos=JSON.parse(x.photos)}catch{x.photos=[]};if(!Array.isArray(x.photos))x.photos=[];if(typeof x.socials==="string")try{x.socials=JSON.parse(x.socials)}catch{x.socials={}}return x}

for(const [type,c] of Object.entries(CFG)){
 app.post(`/api/${type}`,auth,async(req,res)=>{try{
  if(!clean(req.body.title))return bad(res,"Le titre est requis.");
  const mod=moderate([req.body.title,req.body.category,req.body.description].filter(Boolean).join(" "));
  const fields=["user_id",...c.fields],vals=[req.user.id,...c.fields.map(f=>val(f,req.body[f]))];
  const r=await q(`INSERT INTO ${c.table}(${fields.join(",")},status,created_at,updated_at) VALUES(${vals.map((_,i)=>"$"+(i+1)).join(",")},$${vals.length+1},NOW(),NOW()) RETURNING *`,[...vals,mod.status]);
  const item=parse(r.rows[0]);await notify(req.user.id,"listing",mod.status==="published"?"Publication créée":"Publication en vérification","Votre publication a été enregistrée.",type,item.id);
  res.status(201).json(ok({item,[type.slice(0,-1)]:item}));
 }catch(e){console.error(type,e);bad(res,"Erreur interne lors de la publication.",500)}});

 app.get(`/api/${type}`,async(req,res)=>{try{
  const page=Math.max(1,Math.floor(num(req.query.page,1))),limit=Math.min(50,Math.max(1,Math.floor(num(req.query.limit,20)))),offset=(page-1)*limit,where=["x.status='published'"],params=[];
  const search=clean(req.query.search||req.query.q,300),category=clean(req.query.category,200),city=clean(req.query.city,200),country=clean(req.query.country,200);
  if(search){params.push(`%${search}%`);where.push(`(x.title ILIKE $${params.length} OR COALESCE(x.description,'') ILIKE $${params.length} OR COALESCE(x.category,'') ILIKE $${params.length})`)}
  if(category){params.push(`%${category}%`);where.push(`COALESCE(x.category,'') ILIKE $${params.length}`)}
  if(city){params.push(`%${city}%`);where.push(`COALESCE(x.city,'') ILIKE $${params.length}`)}
  if(country){params.push(`%${country}%`);where.push(`COALESCE(x.country,'') ILIKE $${params.length}`)}
  const count=await q(`SELECT count(*)::int total FROM ${c.table} x WHERE ${where.join(" AND ")}`,params),dp=[...params,limit,offset];
  const r=await q(`SELECT x.*,u.name seller_name,u.photo seller_photo,u.phone seller_phone,u.whatsapp seller_whatsapp FROM ${c.table} x LEFT JOIN users u ON u.id=x.user_id WHERE ${where.join(" AND ")} ORDER BY x.created_at DESC LIMIT $${dp.length-1} OFFSET $${dp.length}`,dp);
  res.json(ok({items:r.rows.map(parse),page,limit,total:count.rows[0].total}));
 }catch(e){console.error(type,e);bad(res,"Erreur interne.",500)}});

 app.get(`/api/${type}/:id`,optAuth,async(req,res)=>{try{
  const r=await q(`SELECT x.*,u.name seller_name,u.email seller_email,u.phone seller_phone,u.whatsapp seller_whatsapp,u.photo seller_photo FROM ${c.table} x LEFT JOIN users u ON u.id=x.user_id WHERE x.id=$1`,[Number(req.params.id)]);
  if(!r.rows.length)return bad(res,"Publication introuvable.",404);
  const item=parse(r.rows[0]),reviews=await q(`SELECT r.*,u.name reviewer_name,u.photo reviewer_photo FROM reviews r LEFT JOIN users u ON u.id=r.reviewer_id WHERE r.target_type=$1 AND r.target_id=$2 ORDER BY r.created_at DESC`,[type,Number(req.params.id)]);
  item.reviews=reviews.rows;res.json(ok({item}));
 }catch(e){console.error(e);bad(res,"Erreur interne.",500)}});

 app.put(`/api/${type}/:id`,auth,async(req,res)=>{try{
  const id=Number(req.params.id),o=await q(`SELECT user_id FROM ${c.table} WHERE id=$1`,[id]);if(!o.rows.length)return bad(res,"Publication introuvable.",404);if(Number(o.rows[0].user_id)!==Number(req.user.id))return bad(res,"Action non autorisée.",403);
  const sets=[],vals=[];for(const f of c.fields)if(req.body[f]!==undefined){vals.push(val(f,req.body[f]));sets.push(`${f}=$${vals.length}`)}if(!sets.length)return bad(res,"Aucune modification reçue.");vals.push(id);
  const r=await q(`UPDATE ${c.table} SET ${sets.join(",")},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,vals);res.json(ok({item:parse(r.rows[0])}));
 }catch(e){bad(res,"Erreur interne.",500)}});

 app.delete(`/api/${type}/:id`,auth,async(req,res)=>{try{
  const id=Number(req.params.id),o=await q(`SELECT user_id FROM ${c.table} WHERE id=$1`,[id]);if(!o.rows.length)return bad(res,"Publication introuvable.",404);if(Number(o.rows[0].user_id)!==Number(req.user.id))return bad(res,"Action non autorisée.",403);
  await q(`DELETE FROM ${c.table} WHERE id=$1`,[id]);res.json(ok({message:"Publication supprimée."}));
 }catch(e){bad(res,"Erreur interne.",500)}})
}

app.get("/api/favorites",auth,async(req,res)=>{try{res.json(ok({favorites:(await q("SELECT * FROM favorites WHERE user_id=$1 ORDER BY created_at DESC",[req.user.id])).rows}))}catch(e){bad(res,"Erreur interne.",500)}});
app.get("/api/favorites/ids",auth,async(req,res)=>{try{res.json(ok({ids:(await q("SELECT item_type,item_id FROM favorites WHERE user_id=$1",[req.user.id])).rows.map(x=>`${x.item_type}:${x.item_id}`)}))}catch(e){bad(res,"Erreur interne.",500)}});
app.post("/api/favorites",auth,async(req,res)=>{try{const t=clean(req.body.item_type||req.body.type,50),id=Number(req.body.item_id||req.body.id);if(!["products","services","businesses"].includes(t)||!Number.isInteger(id))return bad(res,"Favori invalide.");await q("INSERT INTO favorites(user_id,item_type,item_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[req.user.id,t,id]);res.status(201).json(ok({message:"Ajouté aux favoris."}))}catch(e){bad(res,"Erreur interne.",500)}});
app.delete("/api/favorites/:type/:id",auth,async(req,res)=>{try{await q("DELETE FROM favorites WHERE user_id=$1 AND item_type=$2 AND item_id=$3",[req.user.id,req.params.type,Number(req.params.id)]);res.json(ok({message:"Retiré des favoris."}))}catch(e){bad(res,"Erreur interne.",500)}});

app.post("/api/messages",auth,async(req,res)=>{try{const to=Number(req.body.receiver_id||req.body.user_id||req.body.to),body=clean(req.body.body||req.body.message,5000);if(!Number.isInteger(to)||!body)return bad(res,"Destinataire et message requis.");const r=await q("INSERT INTO messages(sender_id,receiver_id,body) VALUES($1,$2,$3) RETURNING *",[req.user.id,to,body]);await notify(to,"message","Nouveau message","Vous avez reçu un nouveau message.","users",req.user.id);res.status(201).json(ok({message:r.rows[0]}))}catch(e){console.error(e);bad(res,"Erreur interne.",500)}});
app.get("/api/messages",auth,async(req,res)=>{try{const w=req.query.with?Number(req.query.with):null;let r;if(w){r=await q(`SELECT m.*,s.name sender_name,s.photo sender_photo,r.name receiver_name,r.photo receiver_photo FROM messages m LEFT JOIN users s ON s.id=m.sender_id LEFT JOIN users r ON r.id=m.receiver_id WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1) ORDER BY m.created_at ASC`,[req.user.id,w]);await q("UPDATE messages SET is_read=true WHERE receiver_id=$1 AND sender_id=$2",[req.user.id,w])}else r=await q(`SELECT m.*,s.name sender_name,s.photo sender_photo,r.name receiver_name,r.photo receiver_photo FROM messages m LEFT JOIN users s ON s.id=m.sender_id LEFT JOIN users r ON r.id=m.receiver_id WHERE m.sender_id=$1 OR m.receiver_id=$1 ORDER BY m.created_at DESC`,[req.user.id]);const items=r.rows.map(m=>({...m,user_id:Number(m.sender_id)===Number(req.user.id)?m.receiver_id:m.sender_id,name:Number(m.sender_id)===Number(req.user.id)?m.receiver_name:m.sender_name,photo:Number(m.sender_id)===Number(req.user.id)?m.receiver_photo:m.sender_photo,unread:Number(m.receiver_id)===Number(req.user.id)&&!m.is_read}));res.json(ok({messages:items,items}))}catch(e){bad(res,"Erreur interne.",500)}});

app.post("/api/reviews",auth,async(req,res)=>{try{const t=clean(req.body.target_type||req.body.type,50),id=Number(req.body.target_id||req.body.id),rating=Math.round(num(req.body.rating,0)),comment=clean(req.body.comment,2000);if(!["users","products","services","businesses"].includes(t)||!Number.isInteger(id)||rating<1||rating>5)return bad(res,"Évaluation invalide.");const r=await q(`INSERT INTO reviews(reviewer_id,target_type,target_id,rating,comment) VALUES($1,$2,$3,$4,$5) ON CONFLICT(reviewer_id,target_type,target_id) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment RETURNING *`,[req.user.id,t,id,rating,comment]);res.status(201).json(ok({review:r.rows[0]}))}catch(e){console.error(e);bad(res,"Erreur interne.",500)}});

app.get("/api/notifications",auth,async(req,res)=>{try{res.json(ok({notifications:(await q("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[req.user.id])).rows}))}catch(e){bad(res,"Erreur interne.",500)}});
app.patch("/api/notifications/:id/read",auth,async(req,res)=>{try{await q("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",[Number(req.params.id),req.user.id]);res.json(ok({message:"Notification lue."}))}catch(e){bad(res,"Erreur interne.",500)}});
app.patch("/api/notifications/read-all",auth,async(req,res)=>{try{await q("UPDATE notifications SET is_read=true WHERE user_id=$1",[req.user.id]);res.json(ok({message:"Notifications lues."}))}catch(e){bad(res,"Erreur interne.",500)}});

app.get("/api/counts",auth,async(req,res)=>{try{const [p,s,b,f,m,n]=await Promise.all([
q("SELECT count(*)::int count FROM products WHERE user_id=$1",[req.user.id]),q("SELECT count(*)::int count FROM services WHERE user_id=$1",[req.user.id]),q("SELECT count(*)::int count FROM businesses WHERE user_id=$1",[req.user.id]),q("SELECT count(*)::int count FROM favorites WHERE user_id=$1",[req.user.id]),q("SELECT count(*)::int count FROM messages WHERE receiver_id=$1 AND is_read=false",[req.user.id]),q("SELECT count(*)::int count FROM notifications WHERE user_id=$1 AND is_read=false",[req.user.id])]);const n0=n.rows[0].count;res.json(ok({products:p.rows[0].count,services:s.rows[0].count,businesses:b.rows[0].count,favorites:f.rows[0].count,unread_messages:m.rows[0].count,notifications:n0,unread_notifications:n0}))}catch(e){bad(res,"Erreur interne.",500)}});

app.post("/api/reports",auth,async(req,res)=>{try{const t=clean(req.body.target_type,50),id=Number(req.body.target_id),reason=clean(req.body.reason,500),details=clean(req.body.details,3000);if(!t||!Number.isInteger(id)||!reason)return bad(res,"Signalement incomplet.");const r=await q("INSERT INTO reports(reporter_id,target_type,target_id,reason,details) VALUES($1,$2,$3,$4,$5) RETURNING *",[req.user.id,t,id,reason,details]);res.status(201).json(ok({report:r.rows[0]}))}catch(e){bad(res,"Erreur interne.",500)}});

app.get("/api/search",async(req,res)=>{try{const term=`%${clean(req.query.q||req.query.search,300)||""}%`;const [p,s,b]=await Promise.all([
q("SELECT p.*,u.name seller_name,u.photo seller_photo,u.whatsapp seller_whatsapp FROM products p LEFT JOIN users u ON u.id=p.user_id WHERE p.status='published' AND (p.title ILIKE $1 OR COALESCE(p.description,'') ILIKE $1 OR COALESCE(p.category,'') ILIKE $1) ORDER BY p.created_at DESC LIMIT 20",[term]),
q("SELECT s.*,u.name seller_name,u.photo seller_photo,u.whatsapp seller_whatsapp FROM services s LEFT JOIN users u ON u.id=s.user_id WHERE s.status='published' AND (s.title ILIKE $1 OR COALESCE(s.description,'') ILIKE $1 OR COALESCE(s.category,'') ILIKE $1) ORDER BY s.created_at DESC LIMIT 20",[term]),
q("SELECT b.*,u.name owner_name,u.photo owner_photo,u.whatsapp owner_whatsapp FROM businesses b LEFT JOIN users u ON u.id=b.user_id WHERE b.status='published' AND (b.title ILIKE $1 OR COALESCE(b.description,'') ILIKE $1 OR COALESCE(b.category,'') ILIKE $1 OR COALESCE(b.city,'') ILIKE $1 OR COALESCE(b.country,'') ILIKE $1) ORDER BY b.created_at DESC LIMIT 20",[term])]);const items=[...p.rows.map(x=>({...parse(x),item_type:"products"})),...s.rows.map(x=>({...parse(x),item_type:"services"})),...b.rows.map(x=>({...parse(x),item_type:"businesses"}))];res.json(ok({items,products:p.rows.map(parse),services:s.rows.map(parse),businesses:b.rows.map(parse)}))}catch(e){bad(res,"Erreur interne.",500)}});

app.use("/api",(req,res)=>res.status(404).json({statut:"erreur",message:"Route API introuvable."}));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));

(async()=>{try{await schema();await q("SELECT 1");app.listen(PORT,()=>console.log(`HELPY server running on port ${PORT}`))}catch(e){console.error("STARTUP ERROR:",e);process.exit(1)}})();
