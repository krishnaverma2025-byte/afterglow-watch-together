import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
test('party chat submits the message textbox, not the host-control checkbox',async()=>{
 const sent=[],message={value:'Hello from the guest'},checkbox={value:'on'},elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,scrollTop:0,scrollHeight:0,replaceChildren(){}});return elements.get(id);};
 const form={};const root={set innerHTML(v){},getElementById:element,querySelector:selector=>selector==='form'?form:selector==='form input'?message:selector==='input'?checkbox:null};
 const host={isConnected:true,style:{},attachShadow:()=>root,remove(){this.isConnected=false;}};
 const document={getElementById:()=>null,createElement:()=>host,documentElement:{append(){}}};
 const chrome={runtime:{sendMessage:async msg=>{sent.push(msg);return {};}}};
 const source=await readFile(new URL('../extension/overlay.js',import.meta.url),'utf8');vm.runInNewContext(source,{document,chrome,window:{addEventListener(){}},setTimeout:()=>0,navigator:{},confirm:()=>true});
 await form.onsubmit({preventDefault(){}});assert.deepEqual(JSON.parse(JSON.stringify(sent.find(m=>m.type==='chat'))),{type:'chat',text:'Hello from the guest'});assert.equal(message.value,'');assert.equal(checkbox.value,'on');
});
test('panel keyboard events stop before document player shortcuts without cancelling typing defaults',async()=>{
 const listeners=new Map(),form={},message={value:''},elements=new Map();
 const root={set innerHTML(v){},getElementById(id){if(!elements.has(id))elements.set(id,{});return elements.get(id);},querySelector:s=>s==='form'?form:message};
 const host={isConnected:true,style:{},attachShadow:()=>root};
 const document={getElementById:()=>null,createElement:()=>host,documentElement:{append(){}}};
 const window={addEventListener(type,fn,capture){assert.equal(capture,true);listeners.set(type,fn);}};
 vm.runInNewContext(await readFile(new URL('../extension/overlay.js',import.meta.url),'utf8'),{document,window,chrome:{runtime:{sendMessage:async()=>({})}},setTimeout:()=>0,navigator:{}});
 assert.deepEqual([...listeners.keys()],['keydown','keypress','keyup']);
 for(const key of [' ','l','L','ArrowRight','ArrowLeft','Enter','Backspace','a'])for(const type of listeners.keys()){
  let stopped=false,prevented=false,playerCalls=0;
  const event={key,composedPath:()=>[host,document,window],stopImmediatePropagation(){stopped=true;},preventDefault(){prevented=true;}};
  listeners.get(type)(event);if(!stopped)playerCalls++;
  assert.equal(playerCalls,0,`${type} ${key} leaked to the player`);assert.equal(prevented,false,'native editing and form defaults must remain available');
  stopped=false;event.composedPath=()=>[document,window];listeners.get(type)(event);assert.equal(stopped,false,'player shortcuts outside the panel must work');
 }
 host.isConnected=false;let stopped=false;listeners.get('keydown')({composedPath:()=>[host],stopImmediatePropagation(){stopped=true;}});assert.equal(stopped,false);
});
