const icon='<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>';
export function downloadState(manifest,previous){return !manifest?.ready?'pending':!previous?'new':Number(previous)<manifest.versionCode?'update':'hidden';}
export function validDownload(manifest){try{const u=new URL(manifest.url);return manifest.ready===true&&Number.isSafeInteger(manifest.versionCode)&&manifest.versionCode>0&&u.protocol==='https:'&&u.hostname==='www.marihome.co.kr'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/river\/downloads\/(?:CHOI-RIVER|MARI-EDU)-Widget-[0-9.]+\.apk$/.test(u.pathname);}catch{return false;}}
export function createWidgetDownload(notify){
 const header=document.querySelector('.header-actions'),button=document.createElement('button');button.type='button';button.className='btn widget-download';button.hidden=true;header.prepend(button);
 const section=document.createElement('section');section.className='notify-section';section.hidden=true;section.innerHTML='<h2>위젯 다운로드</h2><p>같은 APK를 설치한 뒤 학생 연결코드로 연결합니다. 다운로드 기록은 이 브라우저에만 저장되며 설치 완료 여부는 확인하지 않습니다.</p><button type="button" class="btn">위젯 다시 받기</button>';
 document.getElementById('notify-result').before(section);
 const footer=document.createElement('button');footer.type='button';footer.className='btn widget-download-again';footer.textContent='위젯 다시 받기';footer.hidden=true;document.getElementById('footer-actions').append(footer);
 let student='',manifest=null;
 const key=()=> 'river-widget-download-v1:'+student;
 function previous(){try{return localStorage.getItem(key())||'';}catch{return '';}}
 function render(){
  const state=downloadState(manifest,previous());button.hidden=!student||state==='hidden';section.hidden=!student;footer.hidden=!student||state!=='hidden';
  button.classList.toggle('widget-update',state==='update');button.innerHTML=(state==='update'?'Update':'위젯')+icon;button.title=state==='pending'?'서명키 설정 후 설치 파일을 제공합니다.':'위젯 '+manifest.version+' 다운로드';button.setAttribute('aria-label',state==='update'?'위젯 업데이트 다운로드':'위젯 다운로드');button.setAttribute('aria-disabled',String(state==='pending'));
 }
 function download(){
  if(!student)return;if(!validDownload(manifest)){notify('고정 서명키 설정 후 설치 파일을 제공할 예정입니다.');return;}
  const a=document.createElement('a');a.href=manifest.url;a.download='MARI-EDU-Widget-'+manifest.version+'.apk';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();
  try{localStorage.setItem(key(),String(manifest.versionCode));}catch{}render();notify('다운로드를 시작했어요. 완료 후 APK를 열어 설치해 주세요.');
 }
 const confirmDialog=document.createElement('dialog');confirmDialog.className='widget-download-dialog';confirmDialog.setAttribute('aria-labelledby','widget-download-title');
 confirmDialog.innerHTML='<h2 id="widget-download-title">최신 위젯을 다운로드할까요?</h2><p class="widget-release-label" role="status">최신 버전 확인 중…</p><ol><li>다운로드 후: 내 파일 → 다운로드에서 APK 직접 열기</li><li>설치 화면에서: 설치 또는 업데이트 누르기</li><li>Play 프로텍트가 유해 앱으로 경고하면: 설치 중단</li></ol><p>기존 앱은 삭제하지 마세요.</p><div class="widget-download-actions"><button type="button" class="btn" data-cancel>취소</button><button type="button" class="btn primary" data-download disabled>다운로드</button></div>';
 document.body.append(confirmDialog);const confirmButton=confirmDialog.querySelector('[data-download]'),label=confirmDialog.querySelector('.widget-release-label');
 confirmDialog.querySelector('[data-cancel]').onclick=()=>confirmDialog.close();
 confirmButton.onclick=()=>{if(!student||!validDownload(manifest))return;confirmDialog.close();download();};
 async function askDownload(){
  if(!student)return;confirmButton.disabled=true;label.textContent='최신 버전 확인 중…';if(!confirmDialog.open)confirmDialog.showModal();
  try{const response=await fetch('./widget-release.json',{cache:'no-store'});if(!response.ok)throw Error();const current=await response.json();if(!validDownload(current))throw Error();manifest=current;label.textContent='마리 에듀 · '+manifest.version;confirmButton.disabled=!student;render();}
  catch{label.textContent='최신 버전을 확인하지 못했어요. 잠시 후 다시 눌러 주세요.';}
 }
 button.onclick=askDownload;section.querySelector('button').onclick=askDownload;footer.onclick=askDownload;
 let lastCheck=0,inFlight=false;
 async function checkRelease(force=false){
  if(!student||inFlight||(!force&&Date.now()-lastCheck<5*60000))return;
  inFlight=true;lastCheck=Date.now();
  try{const r=await fetch('./widget-release.json',{cache:'no-store'});if(r.ok){const m=await r.json();manifest=validDownload(m)?m:{...m,ready:false};}}catch{}finally{inFlight=false;render();}
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void checkRelease();});
 setInterval(()=>{if(document.visibilityState==='visible')void checkRelease();},5*60000);
 return {async connect(id){student=id||'connected';render();await checkRelease(true);},reset(){student='';if(confirmDialog.open)confirmDialog.close();render();}};
}
