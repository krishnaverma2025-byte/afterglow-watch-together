// Safari has a UUID extension origin rather than Chromium's 32-letter ID.
export function normalizeExtensionOrigin(value){
 if(typeof value!=='string')return null;
 try{const u=new URL(value);if(u.username||u.password||u.port||u.search||u.hash||!['','/'].includes(u.pathname))return null;
 const h=u.hostname.toLowerCase();
 if(u.protocol==='chrome-extension:'&&/^[a-p]{32}$/.test(h))return `chrome-extension://${h}`;
 if(u.protocol==='safari-web-extension:'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(h))return `safari-web-extension://${h}`;
 }catch{}return null;
}
