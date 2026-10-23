import {test} from 'node:test';import assert from 'node:assert/strict';import {createApp} from '../server.js';
test('extension pairing, streaming invitations, title checks and authenticated polling',async()=>{
 const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,ext='a'.repeat(32),origin='chrome-extension://'+ext;
 const request=async(path,body,headers={})=>{const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,headers:r.headers,data:await r.json()};};
 try{
 assert.equal((await request('/api/rooms',{}, {'X-Afterglow-Extension':ext})).status,403);
 assert.equal((await request('/api/extensions',{extensionId:ext},{Origin:origin})).status,403);
 assert.equal((await request('/api/extensions',{extensionId:ext},{Origin:base})).status,200);
 const headers={Origin:origin,'X-Afterglow-Extension':ext};
 const r=await request('/api/rooms',{mode:'streaming',name:'Host',media:'https://www.netflix.com/watch/123456?privateTracking=omit',initialPlayback:{paused:false,position:12}},headers);assert.equal(r.status,201);assert.equal(r.headers.get('access-control-allow-origin'),origin);
 assert.equal(r.data.state.content.url,'https://www.netflix.com/watch/123456');const path='/api/rooms/'+r.data.state.id;
 const info=await request(path+'/info');assert.equal(info.data.mode,'streaming');assert.equal(info.data.members,undefined);assert.equal(info.data.token,undefined);
 assert.equal((await request(path+'/join',{name:'Wrong title',content:{provider:'netflix',contentId:'999'}})).status,409);
 assert.equal((await request(path+'/join',{name:'Right title',content:{provider:'netflix',contentId:'123456'}})).status,201);
 assert.equal((await request(path+'/state')).status,401);
 const snapshot=await request(path+'/state',undefined,{...headers,Authorization:'Bearer '+r.data.token});assert.equal(snapshot.status,200);assert.equal(snapshot.data.playback.position,12);assert.equal(snapshot.data.playback.paused,false);
 const revoked=await request(path+'/state',undefined,{Origin:'chrome-extension://'+'b'.repeat(32),Authorization:'Bearer '+r.data.token});assert.equal(revoked.status,403);
 await request(path+'/action',{type:'end'},{Authorization:'Bearer '+r.data.token});
 const ended=await request(path+'/state',undefined,{Authorization:'Bearer '+r.data.token});assert.equal(ended.status,200);assert.equal(ended.data.ended,true);
 assert.equal((await request('/api/rooms',{mode:'streaming',name:'H',media:'https://evil.test/watch/1',initialPlayback:{paused:true,position:0}})).status,400);
 assert.equal((await request('/api/rooms',{name:'H',media:'https://www.netflix.com/watch/123456'})).status,400);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('Safari UUID origins pair and authenticate without allowing arbitrary origins',async()=>{
 const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,origin='safari-web-extension://12345678-1234-1234-abcd-123456789abc';
 const send=async(path,body,headers={})=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
 try{
 assert.equal((await send('/api/extensions',{extensionOrigin:origin},{Origin:origin})).status,403);
 assert.equal((await send('/api/extensions',{extensionOrigin:'https://evil.test'},{Origin:base})).status,400);
 assert.equal((await send('/api/extensions',{extensionOrigin:origin},{Origin:base})).status,200);
 const headers={Origin:origin,'X-Afterglow-Extension-Origin':origin};
 const room=await send('/api/rooms',{name:'Safari host',media:'https://example.com/video.mp4'},headers);assert.equal(room.status,201);
 const wrong=await send('/api/rooms/'+room.body.state.id+'/state',null,{...headers,'X-Afterglow-Extension-Origin':'safari-web-extension://99999999-1234-1234-abcd-123456789abc',Authorization:'Bearer '+room.body.token});assert.equal(wrong.status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
