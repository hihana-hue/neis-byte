export function createSettings(request,hasToken){
 const dialog=document.getElementById('notify-dialog'),result=document.getElementById('notify-result');
 const size=document.getElementById('web-title-size'),value=document.getElementById('web-title-size-value');
 let saved=16;try{const raw=localStorage.getItem('river-web-title-size');const n=raw===null?16:Number(raw);if(Number.isInteger(n)&&n>=12&&n<=24)saved=n;}catch{}
 size.value=String(saved);value.textContent=String(saved);document.documentElement.style.setProperty('--river-title-size',saved+'px');
 size.oninput=()=>{value.textContent=size.value;};
 document.getElementById('web-style-save').onclick=()=>{const n=Number(size.value);if(!Number.isInteger(n)||n<12||n>24)return;document.documentElement.style.setProperty('--river-title-size',n+'px');try{localStorage.setItem('river-web-title-size',String(n));}catch{}result.textContent='설정을 저장했어요.';};
 const footer=document.createElement('button');footer.type='button';footer.className='btn web-settings-footer';footer.textContent='화면 설정 · 업데이트 안내';footer.onclick=()=>{result.textContent='';if(!dialog.open)dialog.showModal();};document.getElementById('footer-actions').prepend(footer);
 document.getElementById('notify-close').onclick=()=>dialog.close();
 return {async open(){result.textContent=hasToken()?'학생 연결코드는 노션 위젯관리 표에서 관리합니다.':'메인 화면의 연결하기를 눌러 학생 연결코드를 입력해 주세요.';if(!dialog.open)dialog.showModal();}};
}
