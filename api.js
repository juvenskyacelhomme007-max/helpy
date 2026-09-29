const API={
 token:()=>localStorage.getItem('helpy_token'),
 user:()=>{try{return JSON.parse(localStorage.getItem('helpy_user'))}catch{return null}},
 setAuth(t,u){localStorage.setItem('helpy_token',t);localStorage.setItem('helpy_user',JSON.stringify(u))},
 logout(){localStorage.removeItem('helpy_token');localStorage.removeItem('helpy_user')},
 async call(method,url,body){
  const h={'Content-Type':'application/json'};if(API.token())h.Authorization='Bearer '+API.token();
  let r;try{r=await fetch('/api'+url,{method,headers:h,body:body?JSON.stringify(body):undefined});}catch{throw new Error('Connexion impossible.')}
  const d=await r.json().catch(()=>({}));
  if(r.status===401&&API.token()){API.logout();}
  if(!r.ok)throw Object.assign(new Error(d.error||'Une erreur est survenue.'),{status:r.status});return d;},
 get:u=>API.call('GET',u),post:(u,b)=>API.call('POST',u,b),put:(u,b)=>API.call('PUT',u,b),del:u=>API.call('DELETE',u)};
