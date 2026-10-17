# CHOI RIVER 일정 화면

주소: https://www.marihome.co.kr/river/

## 현재 구현

- 한국 시간, 월요일~일요일 기준 이번 주 남은 일정 / 다음 주 일정
- 기한 지난 미완료, 진행 중, 시작 예정, 기한 미정, 그 이후 일정
- 과목별 버튼 필터, 주제 검색, 원본 노션 DB 바로가기
- `완료`와 `봉사완료` 숨김. `작성 완료`는 제출 확인 전까지 진행 중에 표시
- 연결 후 완료 버튼은 노션 저장 성공 시에만 화면에서 제거
- 노션 API 연결 전에는 실제 자료를 표시하지 않음. 샘플은 버튼으로만 명시적으로 표시

## 실제 연결에 남은 설정

GitHub Pages는 정적 화면을 제공하므로 `server/worker.mjs`를 별도 서버에 배포해야 한다.
연결 토큰이나 학생 자료를 공개 저장소에 커밋하면 안 된다.

1. Notion 내부 연결을 만들고 읽기/수정 권한을 부여한다. 학교 DB에 해당 연결을 추가한다.
2. Cloudflare Worker에 `server/worker.mjs`를 배포한다. `server/wrangler.toml`은 배포용 기본 설정이다.
3. 서버의 암호화된 secrets에 `NOTION_TOKEN`과 충분히 긴 무작위 `RIVER_ACCESS_KEY`를 등록한다. 접근 암호는 가족에게만 공유한다. NOTION_TOKEN을 브라우저에 입력하거나 코드에 넣지 않는다.
4. 환경변수 `SCHOOL_DATA_SOURCE_ID`는 `2a9215b9-b774-8167-be3a-000bcc48a1f5`, `ALLOWED_ORIGIN`은 `https://www.marihome.co.kr`로 설정한다.
5. `config.js`의 `apiBase`에 실제 Worker HTTPS 주소를 입력한다.
6. 웹페이지의 ‘일정 불러오기’에서 접근 암호를 입력한다. 암호는 현재 화면의 메모리에서만 사용하며 저장하지 않는다.
7. 실제 조회 확인 후 테스트용 노션 항목으로 완료 처리와 새로고침을 확인한다. API 조회는 페이지 나눔을 끝까지 읽는다.

서버 설정과 실제 노션 조회/수정 검증은 아직 완료되지 않았다. 개인 일정 DB는 아직 지정되지 않아 연결하지 않았다.
새 글 등록/본문 편집은 이 첫 버전의 범위에 포함되지 않는다.

API 자료: https://developers.notion.com/reference/query-a-data-source , https://developers.notion.com/reference/patch-page
