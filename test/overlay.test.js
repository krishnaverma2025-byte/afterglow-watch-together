import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
test('party chat submits the message textbox, not the host-control checkbox',async()=>{
 const sent=[],message={value:'Hello from the guest'},checkbox={value:'on'},elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,scrollTop:0,scrollHeight:0,replaceChildren(){}});return elements.get(id);};
 const form={};const root={set innerHTML(v){},getElementById:element,querySelector:selector=>selector==='form'?form:selector==='form input'?message:selector==='input'?checkbox:null};
 const host={isConnected:true,style:{},attachShadow:()=>root,remove(){this.isConnected=false;}};
 const document={getElementById:()=>null,createElement:()=>host,documentElement:{append(){}}};
 const chrome={runtime:{sendMessage:async msg=>{sent.push(msg);return {};}}};
 const source=await readFile(new URL('../extension/overlay.js',import.meta.url),'utf8');vm.runInNewContext(source,{document,chrome,setTimeout:()=>0,navigator:{},confirm:()=>true});
 await form.onsubmit({preventDefault(){}});assert.deepEqual(JSON.parse(JSON.stringify(sent.find(m=>m.type==='chat'))),{type:'chat',text:'Hello from the guest'});assert.equal(message.value,'');assert.equal(checkbox.value,'on');
});
