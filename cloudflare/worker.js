// Golden Boutique : copie de sécurité des données sur Cloudflare (KV).
// Le logiciel envoie automatiquement une sauvegarde complète ; on garde la plus récente
// et une par jour pendant 60 jours. Accès protégé par la clé BACKUP_KEY.
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Cle'};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json'}});
export default{async fetch(req,env){
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  const url=new URL(req.url),p=url.pathname.replace(/\/+$/,'')||'/';
  if(p==='/')return J({ok:true,app:'Golden Boutique',service:'sauvegardes'});
  if(!env.BACKUP_KEY||req.headers.get('X-Cle')!==env.BACKUP_KEY)return J({erreur:'clé refusée'},401);
  if(p==='/sauvegarde'&&req.method==='POST'){
    const txt=await req.text();if(txt.length>24e6)return J({erreur:'trop volumineux'},413);
    let o;try{o=JSON.parse(txt)}catch(e){return J({erreur:'JSON invalide'},400)}
    const now=new Date().toISOString(),meta={date:now,par:String(o.par||''),taille:txt.length};
    await env.SAUVEGARDES.put('latest',txt,{metadata:meta});
    await env.SAUVEGARDES.put('jour:'+now.slice(0,10),txt,{metadata:meta,expirationTtl:60*86400});
    return J({ok:true,date:now})}
  if(p==='/sauvegardes'&&req.method==='GET'){
    const l=await env.SAUVEGARDES.list();return J({items:l.keys.map(k=>({cle:k.name,...(k.metadata||{})})).sort((a,b)=>a.cle<b.cle?1:-1)})}
  if(p.startsWith('/sauvegarde/')&&req.method==='GET'){
    const v=await env.SAUVEGARDES.get(decodeURIComponent(p.slice(12)));return v?new Response(v,{headers:{...CORS,'Content-Type':'application/json'}}):J({erreur:'introuvable'},404)}
  return J({erreur:'inconnu'},404)}};
