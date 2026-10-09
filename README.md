# MARI EDU LAB

정적 HTML 기반 학습 프로그램 저장소입니다.

## 운영 경로
- `/`: 메인 홈페이지 (`index.html`)
- `/edu/neis-byte/`: 나이스 바이트 계산기
- `/edu/gogeon-word/`: 수능 고전 어휘
- `/edu/economy-word/`: 수능 경제 어휘
- `/edu/exam-prep/hanmun/`: 한문시험준비
- `/edu/interview/gyodae/`: 교대 면접 연습

## 유지해야 할 파일
- 루트 `index.html`: 메인 홈페이지
- `CNAME`: `www.marihome.co.kr` 연결
- `edu/index.html`: `/edu/`에서 메인으로 이동
- `edu/gogeon-word/config.js`: 고전·경제·한문 등 여러 앱이 참조하는 공통 서버 설정
- `edu/` 하위 앱 전체, `public/`

## 정리 기록
사용하지 않는 과거 React/Next.js 계산기, Cloudflare Worker 실행·빌드·테스트 도구와 관련 설정을 `main`에서 정리했습니다. 기존 학습 프로그램과 홈페이지는 그대로 보존했습니다.

삭제 전 백업: `backup-main-before-cleanup-20261008`.

배포 브라우저에서 로그인, 학습 기록, 각 앱 링크의 실제 동작은 별도 확인이 필요합니다.
