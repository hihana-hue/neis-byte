# 고전 어휘 앱: 화면과 인증 서버 분리

## 관리 위치
- 화면 색상/폰트/문구/레이아웃: GitHub의 index.html, app.html, ui.js
- ID/PIN 검증, 세션, 기기한도, 비공개 시트 읽기와 학습 기록: Apps Script Code.gs
- 고정 통신 코드: Apps Script Bridge.html
- 회원 및 학습 기록: 비공개 MariEdu_ID
- 어휘 DB: 비공개 db-gogeon-word

GitHub app.html에는 어휘 데이터가 없습니다. 서버 인증을 통과해야 data와 coverage를 전달받습니다. 인증 토큰은 사용자 브라우저에만 저장합니다.

서버 전환: 개인 설치 패키지의 Code.gs 교체, Bridge.html 추가 후 기존 웹앱을 새 버전으로 배포합니다. 스크립트 속성 SHEET_ID/DATA_SHEET_ID는 유지합니다.
전환 전에는 기존 Apps Script 화면을 표시하고, 새 통신 코드가 연결되면 GitHub 화면으로 전환합니다. 기존 Login/App 서버 파일은 더 이상 사용되지 않습니다.

서버는 marihome.co.kr 두 도메인에서 오는 메시지만 수신합니다. 서브도메인 변경 시 서버 허용 도메인도 변경해야 합니다.

공개 저장소에 회원 시트, PIN, 어휘 DB 파일, 브라우저 인증 토큰, 서버 비밀값을 추가하지 마세요.
