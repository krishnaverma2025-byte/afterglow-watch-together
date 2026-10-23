// Independent URL identification. No media URLs, cookies, or subscription data are acquired.
export function identifyContent(input){
 let u;try{u=new URL(input);}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password)return null;
 const host=u.hostname.toLowerCase(),is=domain=>host===domain||host.endsWith('.'+domain);
 let provider,contentId;
 if(is('netflix.com')){provider='netflix';contentId=u.pathname.match(/^\/watch\/(\d+)(?:\/|$)/)?.[1];}
 else if(is('primevideo.com')||['amazon.com','amazon.co.uk','amazon.de','amazon.co.jp','amazon.in'].some(is)){provider='prime';contentId=u.pathname.match(/\/(?:detail|dp)\/([a-zA-Z0-9.\-]+)(?:\/|$)/)?.[1];if(!contentId&&u.pathname.startsWith('/gp/video/'))contentId=u.searchParams.get('gti');}
 else if(is('hotstar.com')||is('jiohotstar.com')){provider='hotstar';contentId=u.pathname.split('/').filter(x=>/^\d{8,}$/.test(x)).at(-1);}
 if(!provider||!contentId)return null;
 const url=new URL(u.origin+u.pathname);if(provider==='prime'&&u.searchParams.has('gti'))url.searchParams.set('gti',contentId);
 return {provider,contentId,url:url.href};
}
export const sameContent=(a,b)=>!!a&&!!b&&a.provider===b.provider&&a.contentId===b.contentId;
