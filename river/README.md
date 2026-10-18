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

## 강이 디자인 적용

블루 눈동자 포인트, 펄 화이트/라일락 배경, 둥근 카드와 버튼을 적용했다. 과제 제목 클릭 시 상세 카드가 열린다. 모바일 상세 카드는 화면 너비 80vw, 높이 50dvh이며 긴 내용은 카드 본문에서 스크롤한다. 노션 원문 링크는 해당 항목 URL이 있을 때만 표시한다. 연결 전에는 샘플이 자동으로 표시되며 실제 데이터가 아님을 화면에 명시한다. 산이 테마는 구현하지 않았다. 푸시 알림은 아직 구현되지 않았다.


## Academy lessons

`academy.html` reads and writes the existing Notion academy data source. One page is one lesson. Fields are 수업명 (title), 학원 (select 운동/과학), 수업일시 (date with time), 출결 (select 예정/출석/결석), 변경 전 일시 (date), 변경 이력 (rich text), 회차 차감 (checkbox), 메모 (rich text).

API: authenticated `GET /academy`, `POST /academy` and `PATCH /academy/:id`. Rescheduling changes the same row, resets attendance to 예정 and clears the absence charge; it appends an audit note with previous attendance and old/new dates. Attendance can be returned to 예정. Updates reject stale last_edited_time values; Notion has no atomic compare-and-swap, so simultaneous writes from multiple clients still require care.

Counts use recorded lessons only: attended = 1, absent + charge = 1, otherwise = 0. Workout uses packs of 5; science packs of 4. No opening balance or historical lessons are invented. Formula fields in Notion mirror this rule.

The deployed Cloudflare editor must be updated with `server/worker.mjs` before academy requests work. Existing secrets remain unchanged. ACADEMY_DATA_SOURCE_ID is optional because this user's source ID is the code default. Never place Notion tokens or access keys in GitHub.

Push notification source is now implemented, but is active only after Cloudflare worker code deployment, RIVER_KV binding, a Cron trigger, and per-device opt-in. Actual phone delivery must be tested separately.


## Push setup and verification

1. In Cloudflare, bind KV namespace choi-river-notifications as RIVER_KV.
2. Replace the dashboard worker code with the complete server/worker.mjs (it includes push-core.mjs inline; no bundler or imports needed). Existing NOTION_TOKEN and RIVER_ACCESS_KEY secrets stay in Cloudflare.
3. Settings > Trigger events > Cron Triggers: add `*/5 * * * *`. Do not enable duplicate Cron schedules.
4. Open /river/notifications.html, sign in, and click 알림 서버 준비 once. The server generates VAPID keys inside Cloudflare and stores them in KV; the private key is never returned or committed.
5. On Galaxy Chrome, allow notifications and enable this device. Wait about a minute for KV propagation before the test. Check a visible phone notification; provider acceptance alone does not prove delivery.

School reminders: D-7/D-2/D-1 at 20:00 Asia/Seoul (D-7 says prepare this weekend). Academy reminders: previous day 20:00 and one hour before class. Only future triggers after record creation/device registration are eligible. Cron catches up at most ten minutes. Marked complete/attended/absent and changed dates are checked again when content is retrieved. Past alerts are not replayed.

Empty VAPID-authenticated Web Push wakes a service worker; the service worker fetches content over HTTPS using a separate device token restricted to its notification inbox/ack. Notion tokens and the site access key are not stored in the service worker. Notification data is in KV for at most one hour; acknowledged messages are deleted. Device registrations persist until disabled or push-provider expiry.

KV is eventually consistent and browser/OS delivery can be delayed. Sent markers, notification tags and acknowledgments reduce duplicates but are not an exactly-once delivery guarantee. A generic update notification is shown if content is unavailable or no longer current. A provider HTTP 201 is acceptance, not a receipt from the phone. No notification action silently changes attendance.

Use `node --check` on the Worker and frontend files after edits. The helper source is server/push-core.mjs; keep its inline copy at the beginning of server/worker.mjs in sync.
