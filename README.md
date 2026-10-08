# MARI EDU LAB

정적 HTML 기반 학습 도구 저장소입니다. 메인 홈페이지는 루트 `index.html`이며, 사용자용 학습 앱은 `edu/` 아래에 있습니다.

## 현재 경로
- `/`: MARI EDU LAB 메인
- `/edu/neis-byte/`: 나이스 바이트 계산기 (독립 HTML)
- `/edu/gogeon-word/`: 수능 고전 어휘
- `/edu/economy-word/`: 수능 경제 어휘
- `/edu/exam-prep/hanmun/`: 한문시험준비
- 영생고 선택과목: 별도 GitHub Pages 저장소 링크

## 의존성 주의
- 경제 어휘의 `config.js`는 `/edu/gogeon-word/config.js`를 불러옵니다.
- 한문시험준비의 `index.html`도 `/edu/gogeon-word/config.js`를 불러옵니다.
- 따라서 고전 어휘의 `config.js`는 세 앱이 공유하는 인증 서버 주소 설정으로, 삭제하거나 경로를 바꾸면 안 됩니다.
- 로그인 및 학습 기록은 Google Apps Script와 브라우저 저장소 관련 코드가 포함됩니다. 실제 인증·기록 저장 동작은 별도 운영 테스트가 필요합니다.

## 배포 및 복구
- `CNAME`은 `www.marihome.co.kr` 도메인에 사용됩니다.
- 이전 React/Next.js 계산기 및 관련 개발 도구는 별도 정리 브랜치에서 제거했습니다. 현재 HTML 계산기 파일은 변경하지 않았습니다.
- 백업 브랜치: `backup-before-root-cleanup-20261008`
- 정리 브랜치: `cleanup-legacy-react-20261008`
- GitHub Pages 배포 설정 및 실사용 브라우저 테스트를 확인한 뒤 `main`에 병합하세요.
