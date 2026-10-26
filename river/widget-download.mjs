const icon='<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>';
export function downloadState(manifest,previous){return !manifest?.ready?'pending':!previous?'new':Number(previous)<manifest.versionCode?'update':'hidden';}
export function validDownload(manifest){try{const u=new URL(manifest.url);return manifest.ready===true&&Number.isSafeInteger(manifest.versionCode)&&manifest.versionCode>0&&u.protocol==='https:'&&u.hostname==='www.marihome.co.kr'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/river\/downloads\/CHOI-RIVER-Widget-[0-9.]+\.apk$/.test(u.pathname);}catch{return false;}}
export function createWidgetDownload(notify){
 const header=document.querySelector('.header-actions'),button=document.createElement('button');button.type='button';button.className='btn widget-download';button.hidden=true;header.prepend(button);
 const section=document.createElement('section');section.className='notify-section';section.hidden=true;section.innerHTML='<h2>위젯 다운로드</h2><p>같은 APK를 설치한 뒤 학생 연결코드로 연결합니다. 다운로드 기록은 이 브라우저에만 저장되며 설치 완료 여부는 확인하지 않습니다.</p><button type="button" class="btn">위젯 다시 받기</button>';
 document.getElementById('notify-result').before(section);
 const footer=document.createElement('button');footer.type='button';footer.className='btn widget-download-again';footer.textContent='위젯 다시 받기';footer.hidden=true;document.querySelector('main').append(footer);
 let student='',manifest=null;
 const key=()=> 'river-widget-download-v1:'+student;
 function previous(){try{return localStorage.getItem(key())||'';}catch{return '';}}
 function render(){
  const state=downloadState(manifest,previous());button.hidden=!student||state==='hidden';section.hidden=!student;footer.hidden=!student||state!=='hidden';
  button.classList.toggle('widget-update',state==='update');button.innerHTML=(state==='update'?'Update':'위젯')+icon;button.title=state==='pending'?'서명키 설정 후 설치 파일을 제공합니다.':'위젯 '+manifest.version+' 다운로드';button.setAttribute('aria-label',state==='update'?'위젯 업데이트 다운로드':'위젯 다운로드');button.setAttribute('aria-disabled',String(state==='pending'));
 }
 function download(){
  if(!student)return;if(!validDownload(manifest)){notify('고정 서명키 설정 후 설치 파일을 제공할 예정입니다.');return;}
  const a=document.createElement('a');a.href=manifest.url;a.download='CHOI-RIVER-Widget-'+manifest.version+'.apk';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();
  try{localStorage.setItem(key(),String(manifest.versionCode));}catch{}render();notify('다운로드를 시작했어요. 완료 후 APK를 열어 설치해 주세요.');
 }
 button.onclick=download;section.querySelector('button').onclick=download;footer.onclick=()=>document.getElementById('notify-dialog').showModal();
 let lastCheck=0,inFlight=false;
 async function checkRelease(force=false){
  if(!student||inFlight||(!force&&Date.now()-lastCheck<5*60000))return;
  inFlight=true;lastCheck=Date.now();
  try{const r=await fetch('./widget-release.json',{cache:'no-store'});if(r.ok){const m=await r.json();manifest=validDownload(m)?m:{...m,ready:false};}}catch{}finally{inFlight=false;render();}
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void checkRelease();});
 setInterval(()=>{if(document.visibilityState==='visible')void checkRelease();},5*60000);
 return {async connect(id){student=id||'connected';render();await checkRelease(true);},reset(){student='';render();}};
}
