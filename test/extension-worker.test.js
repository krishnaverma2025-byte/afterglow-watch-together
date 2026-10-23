import {test} from 'node:test';import assert from 'node:assert/strict';import {createApp} from '../server.js';
test('extension worker synchronizes two tabs, rejects guest control, shares control, blocks wrong titles',async()=>{
 const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,realFetch=global.fetch,extensionId='c'.repeat(32),sessions={},tabs={1:{id:1,url:'https://www.netflix.com/watch/123456'},2:{id:2,url:'https://www.netflix.com/watch/123456'}},players={1:{ok:true,paused:true,position:10,duration:200,adapter:'mock',buffering:false},2:{ok:true,paused:true,position:0,duration:200,adapter:'mock',buffering:false}},commands=[];let listener;
 await realFetch(base+'/api/extensions',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({extensionId})});
 global.fetch=(url,options)=>realFetch(String(url).replace('http://localhost:3000',base).replace('https://afterglow-watch-together-kv.amused-gem-5551.chatgpt.site',base),options);
 global.chrome={runtime:{id:extensionId,getURL:p=>`chrome-extension://${extensionId}/${p}`,onMessage:{addListener:f=>{listener=f;}}},tabs:{get:async id=>tabs[id],onRemoved:{addListener:()=>{}}},storage:{session:{get:async key=>structuredClone({[key]:sessions[key]}),set:async values=>{Object.assign(sessions,structuredClone(values));},remove:async key=>{delete sessions[key];}}},scripting:{executeScript:async options=>{if(options.files)return [];commands.push(options.args[0]);const player=players[options.target.tabId];if(options.args[0].type==='apply'){player.paused=options.args[0].paused;player.position=options.args[0].position;}return [{result:{...player}}];}}};
 const popup=(type,tabId,fields={})=>new Promise(resolve=>listener({type,tabId,...fields},{url:`chrome-extension://${extensionId}/popup.html`},resolve));const tick=tabId=>new Promise(resolve=>listener({type:'tick'},{tab:tabs[tabId]},resolve));
 try{
 await import('../extension/background.js');
 const host=await popup('create',1,{name:'Host',title:'Test party',hostOnly:true});assert.ok(host.invite,host.error);
 const guest=await popup('join',2,{name:'Guest',invite:host.invite});assert.ok(guest.invite,guest.error);
 assert.notEqual(sessions['tab:1'].token,sessions['tab:2'].token);
 await tick(1);await tick(2);assert.equal(players[2].position,10);
 players[1].position=45;const update=await tick(1);assert.equal(update.state.playback.position,45);await tick(2);assert.equal(players[2].position,45);
 players[2].position=90;const rejected=await tick(2);assert.equal(rejected.state.playback.position,45);assert.equal(players[2].position,45);
 const session=sessions['tab:1'];const changed=await new Promise(resolve=>listener({type:'settings',hostOnly:false},{tab:tabs[1]},resolve));assert.equal(changed.state.hostOnly,false);const forbidden=await new Promise(resolve=>listener({type:'settings',hostOnly:true},{tab:tabs[2]},resolve));assert.match(forbidden.error,/Only the host/);
 await tick(2);players[2].position=65;const shared=await tick(2);assert.equal(shared.state.playback.position,65);
 const count=commands.length;tabs[2].url='https://www.netflix.com/watch/999999';const mismatch=await tick(2);assert.match(mismatch.error,/changed titles/);assert.equal(commands.length,count);
 assert.equal(JSON.stringify(commands).includes(session.token),false);
 assert.match((await popup('create',1,{name:'Host'})).error,/already in a party/);
 }finally{global.fetch=realFetch;delete global.chrome;server.closeAllConnections();await new Promise(r=>server.close(r));}
});
