import {previewSubjects} from './subjects.mjs';
const $=id=>document.getElementById(id),base=(window.RIVER_CONFIG?.apiBase||'').replace(/\/$/,'');
const authKey='river-student-access-v2';
function saved(){try{return localStorage.getItem(authKey)||'';}catch{return '';}}
function forget(){try{localStorage.removeItem(authKey);}catch{}}
let token='',busy=false,connected=false;
function result(message,error=false){$('write-result').textContent=message;$('write-result').classList.toggle('error',error);}
function options(subjects){const current=$('subject').value;$('subject').replaceChildren();const first=document.createElement('option');first.value='';first.textContent='과목 선택';$('subject').append(first);for(const name of subjects){const option=document.createElement('option');option.value=name;option.textContent=name;$('subject').append(option);}if(subjects.includes(current))$('subject').value=current;}
async function api(path,method='GET',body){const response=await fetch(base+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await response.json();}catch{throw Error('서버 응답을 확인하지 못했어요.');}if(!response.ok){if(response.status===401){connected=false;token='';forget();$('save').disabled=true;$('unlock').textContent='다시 연결';}throw Error(data.error||'저장하지 못했어요.');}return data;}
options(previewSubjects);
if(!base){$('write-note').textContent='입력 미리보기 · 노션 연결 전이라 아직 저장할 수 없어요.';$('unlock').disabled=true;}else{$('write-note').textContent='위의 연결 버튼을 눌러 노션을 연결해 주세요.';}
$('unlock').onclick=()=>{if(!busy)$('write-login').showModal();};
$('access-cancel').onclick=()=>$('write-login').close();
$('access-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;token=$('access').value.trim();$('access').value='';$('write-login').close();$('unlock').disabled=true;try{const data=await api('/options');if(!Array.isArray(data.subjects))throw Error('노션 과목 목록을 불러오지 못했어요.');options(data.subjects);connected=true;$('save').disabled=false;$('unlock').textContent='연결됨';$('write-note').textContent=(data.student?.name?data.student.name+'의 ':'연결된 ')+'학교 DB에 새 일정으로 저장됩니다.';result('');}catch(e){connected=false;token='';$('save').disabled=true;result(e.message,true);}finally{busy=false;$('unlock').disabled=false;}};
$('write-form').onsubmit=async e=>{e.preventDefault();if(busy||!connected||!base){if(!connected)result('노션 연결 후 저장할 수 있어요.',true);return;}const title=$('topic').value.trim(),subject=$('subject').value,due=$('due').value;if(!title||!subject||!due){result('과목·마감일·주제를 입력해 주세요.',true);return;}busy=true;$('save').disabled=true;$('unlock').disabled=true;result('저장 중…');try{const data=await api('/tasks','POST',{subject,due,title});if(!data.ok)throw Error('저장 결과를 확인하지 못했어요.');$('topic').value='';result('노션에 저장했어요. 다음 일정을 입력할 수 있어요.');}catch(e){result(e.message,true);}finally{busy=false;$('save').disabled=!connected;$('unlock').disabled=false;}};

if(base&&(token=saved())){busy=true;api('/options').then(data=>{if(!Array.isArray(data.subjects))throw Error('과목 목록을 확인해 주세요.');options(data.subjects);connected=true;$('save').disabled=false;$('unlock').textContent='연결됨';$('write-note').textContent=(data.student?.name?data.student.name+'의 ':'연결된 ')+'학교 DB에 새 일정으로 저장됩니다.';}).catch(e=>result(e.message,true)).finally(()=>{busy=false;});}
