const chrome=globalThis.browser ?? globalThis.chrome;
const $=id=>document.getElementById(id);let tabId;
$('extensionId').value=chrome.runtime.getURL('').split('/').slice(0,3).join('/');
const stored=await chrome.storage.local.get(['name','invite']);$('name').value=stored.name||'';$('invite').value=stored.invite||'';
const [tab]=await chrome.tabs.query({active:true,currentWindow:true});tabId=tab?.id;
async function send(type){$('status').textContent='Connecting…';$('openTitle').hidden=true;$('create').disabled=$('join').disabled=true;try{await chrome.storage.local.set({name:$('name').value,invite:$('invite').value});const r=await chrome.runtime.sendMessage({type,tabId,name:$('name').value,title:$('title').value,hostOnly:$('hostOnly').checked,invite:$('invite').value});if(r.openUrl){$('openTitle').href=r.openUrl;$('openTitle').hidden=false;}if(r.error)throw Error(r.error);if(r.invite){$('invite').value=r.invite;$('status').textContent='Connected! The party panel is now on your streaming page. Copy the invitation below.';await chrome.storage.local.set({invite:r.invite});}}catch(e){$('status').textContent=e.message;}finally{$('create').disabled=$('join').disabled=false;}}
$('create').onclick=()=>send('create');$('join').onclick=()=>send('join');
try{const r=await chrome.runtime.sendMessage({type:'inspect',tabId});$('identity').textContent=r.error||`${r.content.provider} · ${r.content.contentId} · ${r.snapshot.ok?r.snapshot.adapter:r.snapshot.error}`;}catch{$('identity').textContent='Open a streaming title in this browser first.';}
