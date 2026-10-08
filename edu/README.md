# MARI EDU LAB 학습 프로그램

- `neis-byte/`: 독립 HTML 기반 나이스 바이트 계산기
- `gogeon-word/`: 고전 어휘 학습, 로그인 UI 및 어휘 데이터
- `economy-word/`: 경제 어휘 학습, 로그인 UI
- `exam-prep/hanmun/`: 한문시험준비, 로그인 UI
- `index.html`: 루트 홈페이지로 이동

## 주의
`gogeon-word/config.js`는 경제 어휘와 한문시험준비도 사용하는 공통 인증 서버 주소 설정입니다. 위치나 이름을 바꿀 때는 세 프로그램의 참조를 함께 수정해야 합니다.

로그인, 기기 제한, 학습 기록의 실제 작동 여부는 Google Apps Script 배포와 브라우저 환경에서 검증해야 합니다.
