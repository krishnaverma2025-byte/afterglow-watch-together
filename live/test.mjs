import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {api} from './worker/api.js';import {identifyContent} from './extension/providers.js';import {normalizeExtensionOrigin} from './extension/extension-origin.js';
test('persistent Worker rooms preserve membership and enforce host permissions and revisions',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./drizzle/0000_rooms.sql',import.meta.url),'utf8'));const DB={prepare(query){let values=[];return {bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values);},async run(){return {meta:{changes:sql.prepare(query).run(...values).changes}};}};}};
 const call=async(path,body,token)=>{const request=new Request('https://example.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const response=await api(request,{DB},identifyContent,normalizeExtensionOrigin);return {status:response.status,data:await response.json()};};
 const h=await call('/api/rooms',{name:'Host',media:'https://example.test/movie.mp4'});assert.equal(h.status,201);const path='/api/rooms/'+h.data.state.id;
 const guest=await call(path+'/join',{name:'Guest'});assert.equal(guest.status,201);assert.equal((await call(path+'/action',{type:'playback',paused:false,position:10,revision:0},guest.data.token)).status,403);
 assert.equal((await call(path+'/action',{type:'playback',paused:false,position:10,revision:0},h.data.token)).status,200);
 assert.equal((await call(path+'/action',{type:'playback',paused:true,position:11,revision:0},h.data.token)).status,409);
 const stored=await call(path+'/state',null,guest.data.token);assert.equal(stored.data.playback.position,10);assert.equal(stored.data.members.length,2);assert.equal(JSON.stringify(stored.data).includes(h.data.token),false);
 assert.equal((await call(path+'/action',{type:'end'},h.data.token)).status,200);assert.equal((await call(path+'/join',{name:'Late'})).status,410);sql.close();
});
