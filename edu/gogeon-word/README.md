# 2027 고전 어휘 로그인

공개 저장소에는 연결 화면과 서버 코드만 있습니다. 어휘 자료와 회원 PIN은 공개하지 않습니다.

## 비공개 데이터
- 회원/기기/학습 기록: MariEdu_ID
- 어휘 DB: db-gogeon-word의 어휘자료 탭

Apps Script의 스크립트 속성 SHEET_ID에 회원 시트 ID, DATA_SHEET_ID에 자료 시트 ID를 설정합니다.
서버 코드 Code.gs, Login.html, appsscript.json과 개인 설치 파일의 App.html을 프로젝트에 넣습니다. App.html은 이제 자료가 없는 화면 템플릿입니다.

자료를 수정하거나 행을 추가한 뒤 앱을 새로고침하면 DB를 다시 읽습니다. 새 카드 ID가 비어 있으면 서버가 자동 생성하며 기존 ID는 유지해야 합니다. 사용 열의 숨김은 제외합니다.

로그인/3기기 제한/기기 해제/PIN 변경/날짜별 기록과 DB 읽기의 모의 검증은 통과했습니다. 실제 배포와 실기기 검증은 남아 있습니다.
배포는 실행 사용자 나, 접근 모든 사용자. 원본 시트/프로젝트는 비공개입니다.
배포 후 config.js의 MARI_APP_URL에 /exec 주소를 넣습니다.
https://developers.google.com/apps-script/guides/web
