import http from 'node:http';
import {normalizeExtensionOrigin} from './extension/extension-origin.js';
import {identifyContent,sameContent} from './extension/providers.js';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('./public/',import.meta.url);
const id=()=>randomBytes(24).toString('base64url');
export function createApp(){
 const rooms=new Map();
 const extensionOrigins=new Set([...(process.env.AFTERGLOW_EXTENSION_IDS||'').split(',').filter(x=>/^[a-p]{32}$/.test(x)).map(x=>'chrome-extension://'+x),...(process.env.AFTERGLOW_EXTENSION_ORIGINS||'').split(',').map(normalizeExtensionOrigin).filter(Boolean)]);
 const fail=(status,message)=>Object.assign(new Error(message),{status});
 const publicState=r=>({id:r.id,title:r.title,media:r.media,mode:r.mode,content:r.content,hostOnly:r.hostOnly,reactions:r.reactions,ended:r.ended,revision:r.revision,playback:r.playback,members:[...r.members.values()].map(m=>({id:m.id,name:m.name,host:m.token===r.host,online:m.connections.size>0||Date.now()-(m.lastSeen||0)<5000})),messages:r.messages,serverTime:Date.now()});
 const emit=(res,data)=>res.write(`data: ${JSON.stringify(data)}\n\n`);
 const broadcast=r=>{const state=publicState(r);for(const m of r.members.values())for(const res of m.connections)emit(res,state);};
 const name=s=>{if(typeof s!=='string'||!s.trim()||s.trim().length>32)throw fail(400,'Enter a name (1–32 characters).');return s.trim();};
 const media=s=>{try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw 0;return u.href;}catch{throw fail(400,'Use a direct HTTP or HTTPS video URL.');}};
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; media-src http: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
 try{
 const url=new URL(req.url,'http://localhost');
 // Mutations are same-origin. No permissive CORS or third-party cookies.
 const origin=req.headers.origin,extensionId=req.headers['x-afterglow-extension'],claimedOrigin=req.headers['x-afterglow-extension-origin'];
 const normalizedClaim=normalizeExtensionOrigin(claimedOrigin);
 const ownOrigin=origin===`http://${req.headers.host}`||origin===`https://${req.headers.host}`;
 const normalizedOrigin=normalizeExtensionOrigin(origin),pairedOrigin=!!normalizedOrigin&&extensionOrigins.has(normalizedOrigin);
 if(claimedOrigin&&(!normalizedClaim||!extensionOrigins.has(normalizedClaim)))throw fail(403,'Pair this extension using its full origin at localhost:3000/streaming first.');
 if(origin&&claimedOrigin&&normalizedOrigin!==normalizedClaim)throw fail(403,'Extension origin mismatch.');
 if(extensionId&&!extensionOrigins.has('chrome-extension://'+extensionId))throw fail(403,'Pair this extension in Afterglow at localhost:3000/streaming first.');
 if(origin&&!ownOrigin&&!pairedOrigin)throw fail(403,'Origin not allowed.');
 if(pairedOrigin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Afterglow-Extension, X-Afterglow-Extension-Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');}
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 let body={};
 if(req.method==='POST'){let bytes=0;let parts=[];for await(const p of req){bytes+=p.length;if(bytes>8192)throw fail(413,'Request too large.');parts.push(p);}try{body=JSON.parse(Buffer.concat(parts).toString()||'{}');}catch{throw fail(400,'Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw fail(400,'Invalid request.');}
 if(req.method==='POST'&&url.pathname==='/api/extensions'){
 if(!ownOrigin||extensionId||claimedOrigin)throw fail(403,'Pair only from the local setup page.');
 const extensionOrigin=normalizeExtensionOrigin(body.extensionOrigin)||(typeof body.extensionId==='string'&&/^[a-p]{32}$/.test(body.extensionId)?'chrome-extension://'+body.extensionId:null);
 if(!extensionOrigin)throw fail(400,'Paste the full Safari extension origin from its popup.');
 extensionOrigins.add(extensionOrigin);return json(res,200,{paired:true});
 }
 if(req.method==='POST'&&url.pathname==='/api/rooms'){
 if(rooms.size>=500)throw fail(503,'Room capacity reached. Try later.');
 const hostName=name(body.name),video=media(body.media),token=id(),roomId=id();
 const streaming=body.mode==='streaming',content=streaming?identifyContent(video):null;
 if(streaming&&!content)throw fail(400,'Open a supported Netflix, Prime Video or Hotstar title URL.');
 if(!streaming&&identifyContent(video))throw fail(400,'Streaming-service titles need the Afterglow browser extension. Open /streaming for setup.');
 const initial=streaming?body.initialPlayback:{paused:true,position:0};
 if(!initial||typeof initial.paused!=='boolean'||!Number.isFinite(initial.position)||initial.position<0||initial.position>604800)throw fail(400,'Invalid initial playback state.');
 const r={id:roomId,title:typeof body.title==='string'?body.title.trim().slice(0,80)||'Movie night':'Movie night',media:video,mode:streaming?'streaming':'direct',content,host:token,hostOnly:body.hostOnly!==false,reactions:body.reactions!==false,revision:0,ended:false,created:Date.now(),playback:{paused:initial.paused,position:initial.position,updatedAt:Date.now()},members:new Map(),messages:[]};
 r.members.set(token,{id:id(),token,name:hostName,connections:new Set()});rooms.set(roomId,r);return json(res,201,{token,memberId:r.members.get(token).id,state:publicState(r)});
 }
 const match=url.pathname.match(/^\/api\/rooms\/([\w-]+)\/(join|events|action|state|info)$/);
 if(match){const r=rooms.get(match[1]);if(!r)throw fail(404,'Party not found or expired.');if(r.ended&&match[2]!=='state')throw fail(410,'This party has ended.');
 if(match[2]==='info'&&req.method==='GET')return json(res,200,{id:r.id,title:r.title,mode:r.mode,content:r.content});
 if(match[2]==='join'&&req.method==='POST'){
 if(r.mode==='streaming'&&!sameContent(body.content,r.content))throw fail(409,'Open the same streaming title using the Afterglow extension to join.');
 if(r.members.size>=50)throw fail(409,'This party is full.');const token=id();const m={id:id(),token,name:name(body.name),connections:new Set()};r.members.set(token,m);broadcast(r);return json(res,201,{token,memberId:m.id,state:publicState(r)});
 }
 const token=match[2]==='events'?url.searchParams.get('token'):req.headers.authorization?.replace(/^Bearer /,'');const m=r.members.get(token);if(!m)throw fail(401,'Please join this party first.');
 m.lastSeen=Date.now();
 if(match[2]==='state'&&req.method==='GET')return json(res,200,publicState(r));
 if(match[2]==='events'&&req.method==='GET'){
 if(m.connections.size>=5)throw fail(429,'Too many connections.');res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});m.connections.add(res);broadcast(r);const timer=setInterval(()=>res.write(': heartbeat\n\n'),15000);req.on('close',()=>{clearInterval(timer);m.connections.delete(res);broadcast(r);});return;
 }
 if(match[2]==='action'&&req.method==='POST'){
 if(body.type==='playback'){
 if(r.hostOnly&&token!==r.host)throw fail(403,'Only the host can control playback.');
 if(body.revision!==r.revision)throw fail(409,'Playback changed. Please try again.');
 if(typeof body.paused!=='boolean'||!Number.isFinite(body.position)||body.position<0||body.position>604800)throw fail(400,'Invalid playback state.');
 if(m.lastPlayback&&Date.now()-m.lastPlayback<100)throw fail(429,'Playback updates are too frequent.');m.lastPlayback=Date.now();
 r.playback={paused:body.paused,position:body.position,updatedAt:Date.now()};r.revision++;
 }else if(body.type==='chat'||body.type==='reaction'){
 if(m.lastMessage&&Date.now()-m.lastMessage<500)throw fail(429,'Please wait before sending again.');
 if(body.type==='reaction'&&(!r.reactions||!['❤️','😂','👏','🔥'].includes(body.text)))throw fail(400,'Reaction unavailable.');
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>500)throw fail(400,'Messages must be 1–500 characters.');m.lastMessage=Date.now();r.messages.push({id:id(),name:m.name,text:body.text.trim(),at:Date.now(),kind:body.type});r.messages=r.messages.slice(-100);
 }else if(body.type==='settings'){
 if(token!==r.host)throw fail(403,'Only the host can change party settings.');if(typeof body.hostOnly==='boolean')r.hostOnly=body.hostOnly;if(typeof body.reactions==='boolean')r.reactions=body.reactions;
 }else if(body.type==='rename'){m.name=name(body.name);
 }else if(body.type==='leave'){
 if(token===r.host)r.ended=true;else{for(const c of m.connections){emit(c,{...publicState(r),left:true});c.end();}r.members.delete(token);}
 }else if(body.type==='end'){if(token!==r.host)throw fail(403,'Only the host can end the party.');r.ended=true;
 }else throw fail(400,'Unknown action.');broadcast(r);if(r.ended)for(const member of r.members.values())for(const c of member.connections)c.end();return json(res,200,publicState(r));
 }
 throw fail(405,'Method not allowed.');
 }
 if(req.method==='GET'){
 const paths={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/sample.mp4':'sample.mp4','/streaming':'streaming.html','/streaming.js':'streaming.js'};const file=paths[url.pathname]||(url.pathname.match(/^\/party\/[\w-]+$/)?'index.html':null);if(!file)throw fail(404,'Not found.');const content=await readFile(new URL(file,root));if(file.endsWith('.mp4')){const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type','video/mp4');if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),content.length-1):content.length-1;if(start> end||start>=content.length){res.writeHead(416,{'Content-Range':`bytes */${content.length}`});return res.end();}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${content.length}`,'Content-Length':end-start+1});return res.end(content.subarray(start,end+1));}res.writeHead(200,{'Content-Length':content.length});return res.end(content);}res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-cache'});return res.end(content);
 }throw fail(404,'Not found.');
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Something went wrong.'});else res.end();}
 });
 const cleanup=setInterval(()=>{for(const [key,r]of rooms)if(Date.now()-r.created>21600000){r.ended=true;broadcast(r);for(const m of r.members.values())for(const c of m.connections)c.end();rooms.delete(key);}},60000);cleanup.unref();server.on('close',()=>clearInterval(cleanup));return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;createApp().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Watch Together: http://localhost:${port}`));}
