const chrome=globalThis.browser ?? globalThis.chrome;
import {identifyContent,sameContent} from './providers.js';
import {playerCommand} from './player.js';
const API='https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site';
const locks=new Set();
async function request(path,body,token){const res=await fetch(API+path,{method:body===undefined?'GET':'POST',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),'X-Afterglow-Extension-Origin':chrome.runtime.getURL('').split('/').slice(0,3).join('/'),...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});let data;try{data=await res.json();}catch{throw Error('Start the updated Afterglow server on localhost:3000.');}if(!res.ok){const e=Error(data.error||'Request failed.');e.status=res.status;throw e;}return data;}
const key=tabId=>'tab:'+tabId;
async function session(tabId){return(await chrome.storage.session.get(key(tabId)))[key(tabId)];}
const save=(tabId,value)=>chrome.storage.session.set({[key(tabId)]:value});
async function player(tabId,command={type:'inspect'}){const results=await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:playerCommand,args:[command]});return results[0]?.result||{ok:false,error:'Player did not respond.'};}
async function attach(tabId){await chrome.scripting.executeScript({target:{tabId},files:['overlay.js']});}
async function activeContent(tabId){const tab=await chrome.tabs.get(tabId);const content=identifyContent(tab.url);if(!content)throw Error('Open a Netflix, Prime Video, or Hotstar movie/episode page first.');return content;}
async function dispatch(msg,sender){
 const trustedPopup=sender.url?.startsWith(chrome.runtime.getURL('popup.html'))&&!sender.tab;
 if(!trustedPopup&&!sender.tab)throw Error('Unknown sender.');
 const tabId=trustedPopup?msg.tabId:sender.tab.id;if(!Number.isInteger(tabId))throw Error('No selected tab.');
 if(msg.type==='inspect'){if(!trustedPopup)throw Error('Popup required.');const content=await activeContent(tabId),snapshot=await player(tabId),existing=await session(tabId);if(existing&&sameContent(content,existing.content))await attach(tabId);return {content,snapshot,session:!!existing};}
 if(msg.type==='create'||msg.type==='join'){
 const existing=await session(tabId);if(existing){try{const current=await request(`/api/rooms/${existing.roomId}/state`,undefined,existing.token);if(!current.ended)throw Error('This tab is already in a party. Leave it from the party panel first.');await chrome.storage.session.remove(key(tabId));}catch(e){if(![401,404,410].includes(e.status))throw e;await chrome.storage.session.remove(key(tabId));}}
 }
 if(msg.type==='create'){
 if(!trustedPopup)throw Error('Popup required.');const content=await activeContent(tabId),snapshot=await player(tabId);if(!snapshot.ok)throw Error(snapshot.error);
 const data=await request('/api/rooms',{name:msg.name,title:msg.title,mode:'streaming',media:content.url,hostOnly:msg.hostOnly,reactions:true,initialPlayback:{paused:snapshot.paused,position:snapshot.position}});
 await save(tabId,{roomId:data.state.id,token:data.token,memberId:data.memberId,content,lastRevision:-1,lastSnapshot:null});await attach(tabId);return {invite:`${API}/party/${data.state.id}`};
 }
 if(msg.type==='join'){
 if(!trustedPopup)throw Error('Popup required.');let u;try{u=new URL(msg.invite);}catch{throw Error('Paste an Afterglow invitation.');}if(u.origin!==API)throw Error('This development extension uses localhost:3000 invitations.');const roomId=u.pathname.match(/^\/party\/([\w-]+)$/)?.[1];if(!roomId)throw Error('Invalid invitation.');
 const info=await request(`/api/rooms/${roomId}/info`);if(info.mode!=='streaming')throw Error('This invitation is for the website video player. Open it in the Afterglow website.');const content=await activeContent(tabId);if(!sameContent(content,info.content))return {openUrl:info.content.url,error:'Open the party’s movie/episode below, start it, then reopen this extension to join.'};
 const snapshot=await player(tabId);if(!snapshot.ok)throw Error(snapshot.error);
 const data=await request(`/api/rooms/${roomId}/join`,{name:msg.name,content});await save(tabId,{roomId,token:data.token,memberId:data.memberId,content,lastRevision:-1,lastSnapshot:null});await attach(tabId);return {invite:`${API}/party/${roomId}`};
 }
 const s=await session(tabId);if(!s)throw Error('Open the extension and create or join a party.');
 if(msg.type==='leave'){await request(`/api/rooms/${s.roomId}/action`,{type:'leave'},s.token);await chrome.storage.session.remove(key(tabId));return {left:true};}
 if(msg.type==='settings'){const state=await request(`/api/rooms/${s.roomId}/action`,{type:'settings',hostOnly:msg.hostOnly},s.token);return {state,memberId:s.memberId};}
 if(msg.type==='chat'){const state=await request(`/api/rooms/${s.roomId}/action`,{type:'chat',text:msg.text},s.token);return {state,memberId:s.memberId};}
 if(msg.type!=='tick')throw Error('Unknown request.');
 if(locks.has(tabId))return {busy:true};locks.add(tabId);
 try{
 let state=await request(`/api/rooms/${s.roomId}/state`,undefined,s.token);
 if(state.ended){await chrome.storage.session.remove(key(tabId));return {state,memberId:s.memberId};}
 const actual=await activeContent(tabId);if(!sameContent(actual,state.content))return{state,memberId:s.memberId,error:'You changed titles. Return to the party’s movie/episode to resume sync.'};
 let snapshot=await player(tabId);if(!snapshot.ok||snapshot.buffering)return {state,memberId:s.memberId,error:snapshot.error||'Buffering — synchronization is waiting.'};
 const member=state.members.find(m=>m.id===s.memberId),allowed=member?.host||!state.hostOnly;
 const now=Date.now(),sameRevision=s.lastRevision===state.revision,last=s.lastSnapshot;
 // Infer local transport changes only against our own prior commanded/read state.
 // A newly received revision always wins over a simultaneous local change.
 const localChanged=last&&(snapshot.paused!==last.paused||Math.abs(snapshot.position-(last.position+(last.paused?0:(now-s.lastReadAt)/1000)))>2);
 if(allowed&&sameRevision&&localChanged){
  try{state=await request(`/api/rooms/${s.roomId}/action`,{type:'playback',paused:snapshot.paused,position:snapshot.position,revision:state.revision},s.token);}catch(e){state=await request(`/api/rooms/${s.roomId}/state`,undefined,s.token);}
 }else{
  const desired=state.playback.position+(state.playback.paused?0:Math.max(0,(state.serverTime-state.playback.updatedAt)/1000));
  if(snapshot.paused!==state.playback.paused||Math.abs(snapshot.position-desired)>1.5){snapshot=await player(tabId,{type:'apply',paused:state.playback.paused,position:desired});if(!snapshot.ok)return {state,memberId:s.memberId,error:snapshot.error};}
 }
 await save(tabId,{...s,lastRevision:state.revision,lastSnapshot:snapshot,lastReadAt:Date.now()});return {state,memberId:s.memberId,adapter:snapshot.adapter};
 }finally{locks.delete(tabId);}
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{dispatch(msg,sender).then(reply).catch(e=>reply({error:e.message}));return true;});
chrome.tabs.onRemoved.addListener(tabId=>chrome.storage.session.remove(key(tabId)));
