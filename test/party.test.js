import {test} from 'node:test';import assert from 'node:assert/strict';import {createApp} from '../server.js';
test('distinct members join, permissions enforced, shared sync, stale updates, chat and ending',async()=>{
 const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=async(path,data,token)=>{const res=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});return{status:res.status,body:await res.json()};};
 try{
 assert.equal((await post('/api/rooms',{name:'H',media:'javascript:alert(1)'})).status,400);
 const host=await post('/api/rooms',{name:'Host',media:'https://example.com/video.mp4',hostOnly:true});assert.equal(host.status,201);const id=host.body.state.id,route=`/api/rooms/${id}`;
 const guest=await post(route+'/join',{name:'Guest'});assert.equal(guest.status,201);assert.notEqual(host.body.token,guest.body.token);assert.equal(guest.body.state.members.length,2);
 assert.equal((await post(route+'/action',{type:'settings',hostOnly:false},guest.body.token)).status,403);
 assert.equal((await post(route+'/action',{type:'playback',paused:false,position:20,revision:0},guest.body.token)).status,403);
 const controller=new AbortController();const events=await fetch(base+route+'/events?token='+guest.body.token,{signal:controller.signal});assert.equal(events.status,200);const reader=events.body.getReader();const snapshot=new TextDecoder().decode((await reader.read()).value);assert.match(snapshot,/Host/);assert.match(snapshot,/Guest/);
 const play=await post(route+'/action',{type:'playback',paused:false,position:20,revision:0},host.body.token);assert.equal(play.status,200);assert.equal(play.body.revision,1);
 const update=new TextDecoder().decode((await reader.read()).value);assert.match(update,/"position":20/);controller.abort();
 assert.equal((await post(route+'/action',{type:'playback',paused:true,position:21,revision:0},host.body.token)).status,409);
 await post(route+'/action',{type:'settings',hostOnly:false},host.body.token);
 const shared=await post(route+'/action',{type:'playback',paused:true,position:40,revision:1},guest.body.token);assert.equal(shared.status,200);
 const late=await post(route+'/join',{name:'Late viewer'});assert.equal(late.body.state.playback.position,40);assert.equal(late.body.state.playback.paused,true);
 const chat=await post(route+'/action',{type:'chat',text:'<img src=x onerror=alert(1)>'},guest.body.token);assert.equal(chat.status,200);assert.equal(chat.body.messages.length,1);
 assert.equal((await post(route+'/action',{type:'playback',paused:true,position:0,revision:2},'fake')).status,401);
 await post(route+'/action',{type:'end'},host.body.token);
 assert.equal((await post(route+'/join',{name:'Too late'})).status,410);
 assert.equal((await post('/api/rooms/not-a-room/join',{name:'X'})).status,404);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
