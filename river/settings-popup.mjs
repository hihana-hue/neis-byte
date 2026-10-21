export function createSettings(request,hasToken){
 const dialog=document.getElementById('notify-dialog'),result=document.getElementById('notify-result');
 document.getElementById('notify-close').onclick=()=>dialog.close();
 return {async open(){result.textContent=hasToken()?'학생 연결코드는 노션 위젯관리 표에서 관리합니다.':'메인 화면의 연결하기를 눌러 학생 연결코드를 입력해 주세요.';if(!dialog.open)dialog.showModal();}};
}
