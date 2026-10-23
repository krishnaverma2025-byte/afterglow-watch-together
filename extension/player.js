// Serialized by chrome.scripting into the page's MAIN world. Keep self-contained.
// Only playback metadata crosses back to the extension. No account data is read.
export async function playerCommand(command={type:'inspect'}){
 try{
 const host=location.hostname.toLowerCase();
 const is=d=>host===d||host.endsWith('.'+d);
 const fixture=host==='localhost'||host==='127.0.0.1';
 const provider=is('netflix.com')?'netflix':is('hotstar.com')||is('jiohotstar.com')?'hotstar':is('primevideo.com')||['amazon.com','amazon.co.uk','amazon.de','amazon.co.jp','amazon.in'].some(is)?'prime':fixture?'fixture':null;
 if(!provider)return {ok:false,error:'This site is not supported.'};
 const visible=e=>!!e&&e.getBoundingClientRect().width>1&&e.getBoundingClientRect().height>1;
 const videos=[...document.querySelectorAll('video')].filter(visible).sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height);
 const video=videos[0];let player;
 if(provider==='netflix'){
  const api=window.netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
  const sessions=api?.getAllPlayerSessionIds?.()||[];
  const session=sessions.find(s=>String(s).includes('watch'));
  if(session)player=api.getVideoPlayerBySessionId(session);
  if(!player)return {ok:false,error:'Netflix player is unavailable. Open a title, start playback, and retry. The page API may have changed.'};
 }else if(!video)return {ok:false,error:'No visible video player. Start the movie or episode first.'};
 let ad=false;
 if(provider==='netflix'){
  try{const breaks=window.netflix.appContext.state.playerApp.getAPI().state?.playbackState?.currentAdBreak;ad=!!breaks;}catch{}
 }
 for(const selector of ['.atvwebplayersdk-adtimeindicator-text','#ad-video-container video','[data-testid="ad-countdown"]']){const el=document.querySelector(selector);if(visible(el)&&(el.tagName!=='VIDEO'||!el.paused))ad=true;}
 if(ad)return {ok:false,ad:true,error:'An advertisement is playing. Synchronization is suspended; ads are not skipped.'};
 const read=()=>({ok:true,provider,adapter:player?'netflix-page-api':'html-video',paused:player?!!player.isPaused():video.paused,position:player?Number(player.getCurrentTime())/1000:video.currentTime,duration:player?Number(player.getDuration?.()??player.duration)/1000:video.duration,buffering:video?video.readyState<3:false});
 let before=read();if(!Number.isFinite(before.duration)||before.duration<=0)return {ok:false,error:'Only loaded on-demand videos are supported. Live or unknown-length players cannot sync yet.'};if(!Number.isFinite(before.position))return {ok:false,error:'The player has not reported a valid position.'};
 if(command.type==='apply'){
  if(typeof command.paused!=='boolean'||!Number.isFinite(command.position)||command.position<0)return{ok:false,error:'Invalid playback command.'};
  if(before.buffering)return {ok:false,error:'Player is buffering. Waiting before syncing.'};
  if(Number.isFinite(before.duration)&&command.position>before.duration+5)return {ok:false,error:'Video durations differ. Check that everyone opened the same episode.'};
  const target=Math.min(command.position,Number.isFinite(before.duration)?Math.max(0,before.duration-.1):Infinity);
  if(Math.abs(before.position-target)>1.2){if(player)player.seek(Math.round(target*1000));else video.currentTime=target;}
  if(command.paused&&!before.paused){if(player)player.pause();else video.pause();}
  else if(!command.paused&&before.paused){if(player)await player.play();else await video.play();}
  before=read();
 }return before;
 }catch(e){return {ok:false,error:e?.name==='NotAllowedError'?'Click Play on the streaming site once to enable playback.':'Could not access this player. Reload the page and reconnect.'};}
}
