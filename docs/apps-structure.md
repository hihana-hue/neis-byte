# MARI EDU LAB 앱 구성

| 주소 | 파일 | 역할 |
| --- | --- | --- |
| `/` | `index.html` | 메인 홈페이지 |
| `/edu/` | `edu/index.html` | 메인으로 이동 |
| `/edu/neis-byte/` | `edu/neis-byte/index.html` | 나이스 바이트 계산기 |
| `/edu/gogeon-word/` | `edu/gogeon-word/index.html` | 수능 고전 어휘 |
| `/edu/economy-word/` | `edu/economy-word/index.html` | 수능 경제 어휘 |
| `/edu/exam-prep/hanmun/` | `edu/exam-prep/hanmun/index.html` | 한문시험준비 |
| `/edu/interview/gyodae/` | `edu/interview/gyodae/index.html` | 교대 면접 연습 |

## 의존성
`edu/gogeon-word/config.js`는 경제 어휘와 한문시험준비 등에서도 참조하는 공통 설정 파일입니다. 앱의 개별 `ui.js`, `app.html`과 데이터 파일을 유지해야 합니다.

## 이전 개발 환경 정리
과거 React/Next.js·Cloudflare Worker 관련 `app/`, `worker/`, `build/`, `db/`, `drizzle/`, `scripts/`, `tests/` 및 설정 파일을 제거했습니다. 홈페이지와 `edu/`, `CNAME`은 보존했습니다.

백업: `backup-main-before-cleanup-20261008`. 실제 로그인 및 학습 기록 기능은 운영 환경 테스트가 필요합니다.
