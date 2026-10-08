# MARI EDU LAB 앱 구성 및 파일 의존성

| URL | 저장소 파일 | 역할 |
| --- | --- | --- |
| `/` | `index.html` | 메인 메뉴 |
| `/edu/neis-byte/` | `edu/neis-byte/index.html` | 나이스 바이트 계산기 |
| `/edu/gogeon-word/` | `edu/gogeon-word/index.html` | 고전 어휘 및 로그인 화면 |
| `/edu/economy-word/` | `edu/economy-word/index.html` | 경제 어휘 및 로그인 화면 |
| `/edu/exam-prep/hanmun/` | `edu/exam-prep/hanmun/index.html` | 한문시험준비 및 로그인 화면 |

## 공통 의존성
- 고전 어휘: `./config.js`, `./ui.js`, `./app.html` 및 어휘 데이터 파일
- 경제 어휘: `./config.js` -> `/edu/gogeon-word/config.js`, `./ui.js`, `./app.html`
- 한문시험준비: `/edu/gogeon-word/config.js`, `./ui.js`, `./app.html`
- 공통 서버 URL 설정: `edu/gogeon-word/config.js`. 공개 파일에 PIN이나 개인정보를 저장하지 마세요.
- 앱별 인증·학습 기록 로직은 `ui.js`와 Google Apps Script에 연관되어 있습니다. 실제 권한·저장 동작은 배포 환경에서 별도 검증해야 합니다.

## 정리 기록
과거 React/Next.js 계산기의 `app/`, `worker/`, `build/`, `db/`, `drizzle/`, `scripts/`, `tests/` 및 관련 설정은 정리 브랜치에서 제거했습니다. `edu/`, 루트 `index.html`, `CNAME`은 유지했습니다.

운영 배포 설정과 사용자 테스트를 마치기 전까지 정리 브랜치를 `main`에 병합하지 마세요.
