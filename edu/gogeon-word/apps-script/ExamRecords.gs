/* 한문(시험 준비) 기록
   한문 접속 기록은 다른 앱과 같이 학생 탭의 접속 기록(VisitLog.gs)에 '한문'으로 남습니다.
   여기서는 한문 화면이 보내는 신호의 형식만 확인합니다. '시험학습기록' 탭에는 더 이상 쓰지 않습니다. */
function saveExam(token,e){
 if(!e||!['start','pulse','end','test-start','answer','override','finish','abort','writing'].includes(e.type)||!/^[-a-zA-Z0-9]{8,100}$/.test(e.visitId||'')||!/^[-a-zA-Z0-9]{8,100}$/.test(e.eventId||''))throw Error('시험 기록 형식 오류');
 return {ok:true};
}
function examRecordingReady(){return {ok:true,version:3};}
