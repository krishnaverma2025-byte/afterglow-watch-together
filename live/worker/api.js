const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
const fail=(s,m)=>Object.assign(Error(m),{status:s});
function name(v){if(typeof v!=='string'||!v.trim()||v.trim().length>32)throw fail(400,'Enter a name (1–32 characters).');return v.trim();}
function url(v){try{const u=new URL(v);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw 0;return u.href;}catch{throw fail(400,'Invalid video URL.');}}
const view=r=>({...r,host:undefined,members:r.members.map(m=>({id:m.id,name:m.name,host:m.token===r.host,online:true})),serverTime:Date.now()});
export async function api(req,env,identifyContent,normalizeExtensionOrigin){
 const u=new URL(req.url),origin=req.headers.get('Origin'),extension=normalizeExtensionOrigin(req.headers.get('X-Afterglow-Extension-Origin'));
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 const extOrigin=normalizeExtensionOrigin(origin);
 if(extOrigin){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin';headers['Access-Control-Allow-Headers']='Authorization, Content-Type, X-Afterglow-Extension-Origin';headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';}
 const json=(s,v)=>new Response(JSON.stringify(v),{status:s,headers});
 try{
 if(origin&&origin!==u.origin&&!extOrigin)throw fail(403,'Origin not allowed.');
 if(req.headers.has('X-Afterglow-Extension-Origin')&&!extension)throw fail(403,'Invalid extension origin.');
 if(extOrigin&&extension&&extension!==extOrigin)throw fail(403,'Extension origin mismatch.');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 let b={};if(req.method==='POST'){if(Number(req.headers.get('Content-Length'))>8192)throw fail(413,'Request too large.');const text=await req.text();if(text.length>8192)throw fail(413,'Request too large.');try{b=JSON.parse(text);}catch{throw fail(400,'Invalid JSON.');}if(!b||typeof b!=='object'||Array.isArray(b))throw fail(400,'Invalid request.');}
 if(u.pathname==='/api/health')return json(200,{ok:true,storage:'persistent',transport:'https-polling'});
 if(u.pathname==='/api/extensions'&&req.method==='POST'){if(origin!==u.origin)throw fail(403,'Use the website setup page.');if(!normalizeExtensionOrigin(b.extensionOrigin))throw fail(400,'Invalid extension origin.');return json(200,{paired:true});}
 const db=env.DB;if(!db)throw fail(503,'Room database is not configured.');
 if(u.pathname==='/api/rooms'&&req.method==='POST'){
 const ip=req.headers.get('CF-Connecting-IP')||'unknown';const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip))),n=>n.toString(16).padStart(2,'0')).join('');const bucket=hash+':'+Math.floor(Date.now()/600000);
 await db.prepare('INSERT INTO create_limits (bucket,count) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1').bind(bucket).run();
 const limit=await db.prepare('SELECT count FROM create_limits WHERE bucket=?').bind(bucket).first();if(limit.count>10)throw fail(429,'Please wait before creating more parties.');
 await db.prepare('DELETE FROM rooms WHERE expires < ?').bind(Date.now()).run();
 const count=await db.prepare('SELECT COUNT(*) AS count FROM rooms').first();if(count.count>=1000)throw fail(503,'Room capacity reached.');
 const streaming=b.mode==='streaming',media=url(b.media),content=streaming?identifyContent(media):null;
 if(streaming&&!content)throw fail(400,'Open a supported streaming title.');if(!streaming&&identifyContent(media))throw fail(400,'Use the extension for streaming-service titles.');
 const p=streaming?b.initialPlayback:{position:0,paused:true};if(!p||!Number.isFinite(p.position)||p.position<0||p.position>604800||typeof p.paused!=='boolean')throw fail(400,'Invalid playback state.');
 const t=token(),m={id:token(),token:t,name:name(b.name)},r={id:token(),title:typeof b.title==='string'?b.title.trim().slice(0,80)||'Movie night':'Movie night',media,mode:streaming?'streaming':'direct',content,host:t,hostOnly:b.hostOnly!==false,reactions:b.reactions!==false,ended:false,revision:0,playback:{...p,updatedAt:Date.now()},members:[m],messages:[]};
 await db.prepare('INSERT INTO rooms (id,data,version,expires) VALUES (?,?,0,?)').bind(r.id,JSON.stringify(r),Date.now()+21600000).run();return json(201,{token:t,memberId:m.id,state:view(r)});
 }
 const match=u.pathname.match(/^\/api\/rooms\/([\w-]+)\/(info|join|state|events|action)$/);if(!match)throw fail(404,'Not found.');
 const row=await db.prepare('SELECT data,version,expires FROM rooms WHERE id=?').bind(match[1]).first();if(!row||row.expires<Date.now())throw fail(404,'Party not found or expired.');const r=JSON.parse(row.data),kind=match[2];
 if(r.ended&&kind!=='state'&&kind!=='events')throw fail(410,'This party has ended.');
 if(kind==='info'&&req.method==='GET')return json(200,{id:r.id,title:r.title,mode:r.mode,content:r.content});
 async function save(){const result=await db.prepare('UPDATE rooms SET data=?, version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(r),r.id,row.version).run();if(!result.meta.changes)throw fail(409,'Party changed. Please try again.');}
 if(kind==='join'&&req.method==='POST'){
 if(r.members.length>=20)throw fail(409,'Party is full.');if(r.mode==='streaming'&&(!b.content||b.content.provider!==r.content.provider||b.content.contentId!==r.content.contentId))throw fail(409,'Open the same title in the extension.');const m={id:token(),token:token(),name:name(b.name)};r.members.push(m);await save();return json(201,{token:m.token,memberId:m.id,state:view(r)});
 }
 const t=kind==='events'?u.searchParams.get('token'):req.headers.get('Authorization')?.replace(/^Bearer /,'');const m=r.members.find(m=>m.token===t);if(!m)throw fail(401,'Please join the party first.');
 if(kind==='state'&&req.method==='GET')return json(200,view(r));
 if(kind==='events'&&req.method==='GET')return new Response(`retry: 1000\ndata: ${JSON.stringify(view(r))}\n\n`,{headers:{...headers,'Content-Type':'text/event-stream'}});
 if(kind!=='action'||req.method!=='POST')throw fail(405,'Method not allowed.');
 if(b.type==='playback'){
 if(r.hostOnly&&r.host!==t)throw fail(403,'Only the host controls playback.');if(b.revision!==r.revision)throw fail(409,'Playback changed. Try again.');if(!Number.isFinite(b.position)||b.position<0||b.position>604800||typeof b.paused!=='boolean')throw fail(400,'Invalid playback.');r.playback={position:b.position,paused:b.paused,updatedAt:Date.now()};r.revision++;
 }else if(b.type==='settings'){if(r.host!==t)throw fail(403,'Only the host changes settings.');if(typeof b.hostOnly==='boolean')r.hostOnly=b.hostOnly;if(typeof b.reactions==='boolean')r.reactions=b.reactions;
 }else if(b.type==='chat'||b.type==='reaction'){
 if(Date.now()-(m.lastMessage||0)<500)throw fail(429,'Please wait before sending.');if(b.type==='reaction'&&(!r.reactions||!['❤️','😂','👏','🔥'].includes(b.text)))throw fail(400,'Reaction unavailable.');if(typeof b.text!=='string'||!b.text.trim()||b.text.length>500)throw fail(400,'Invalid message.');m.lastMessage=Date.now();r.messages.push({id:token(),name:m.name,text:b.text.trim(),at:Date.now(),kind:b.type});r.messages=r.messages.slice(-100);
 }else if(b.type==='rename'){m.name=name(b.name);
 }else if(b.type==='leave'){if(r.host===t)r.ended=true;else r.members=r.members.filter(x=>x.token!==t);
 }else if(b.type==='end'){if(r.host!==t)throw fail(403,'Only the host can end the party.');r.ended=true;
 }else throw fail(400,'Unknown action.');await save();return json(200,view(r));
 }catch(e){return json(e.status||500,{error:e.status?e.message:'Request failed. Try again.'});}
}
