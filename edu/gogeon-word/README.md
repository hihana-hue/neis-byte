# 2027 고전 어휘 로그인

공개 저장소에는 로그인 서버 코드와 연결 화면만 있습니다. 어휘 자료·인용 예문·PIN은 없습니다.

## 설치 상태
- 인증과 3개 브라우저 등록 제한 코드 작성.
- 관리자 기기 해제 및 PIN 변경 시 서버 세션 무효화.
- 비공개 MariEdu_ID 시트에서 계정 확인.
- 아이디별 탭 상단 기기 목록, 아래 날짜별 테스트 문항·완료·정답 수 기록.
- 모의 테스트 통과. 실제 Google 웹앱 배포와 기기 검증은 미완료.

Google Apps Script 프로젝트에 공개 서버 코드와 개인 설치 패키지의 App.html, CardIds.html을 넣습니다. **App.html / CardIds.html / 설치 ZIP / 계정 시트를 이 저장소에 커밋하지 마세요.**
스크립트 속성 SHEET_ID에 관리자 시트 ID를 설정합니다. 배포는 실행 사용자 ‘나’, 접근 ‘모든 사용자’. 프로젝트와 원본 시트는 비공개로 유지합니다.
배포 후 config.js의 MARI_APP_URL에 /exec 주소를 설정합니다.

자세한 단계는 개인 설치 패키지의 설치안내.md를 참고하세요.
Google 문서: https://developers.google.com/apps-script/guides/web
