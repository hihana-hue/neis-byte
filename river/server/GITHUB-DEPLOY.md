# CHOI RIVER 서버 — PC 설치 없이 배포

GitHub Actions에서 실행합니다. 공개 소스에 인증키를 넣지 마세요.

## 소유자가 한 번 등록할 항목

[Cloudflare API 토큰](https://dash.cloudflare.com/profile/api-tokens)에서 배포용 토큰을 만듭니다. 공식 `Edit Cloudflare Workers` 템플릿을 사용하고 계정 범위를 해당 계정으로 제한합니다. Worker 코드·설정 읽기/배포, Durable Object namespace 생성·연결에 필요한 권한을 포함해야 합니다.

[GitHub Repository secrets](https://github.com/hihana-hue/neis-byte/settings/secrets/actions) → New repository secret에서 다음 두 값을 등록합니다.

| 이름 | 값 |
| --- | --- |
| CLOUDFLARE_API_TOKEN | Cloudflare에서 만든 배포용 API 토큰 |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare Account ID (32자리). Zone ID와 다릅니다. |

기존 서명키 Secrets 4개는 변경하지 않습니다. 인증키를 채팅·노션 본문·소스에 넣지 않습니다.

## 실행 순서

1. [서버 배포 실행 화면](https://github.com/hihana-hue/neis-byte/actions/workflows/river-server-cloudflare.yml) → Run workflow → main → check → Run workflow.
2. 녹색 성공과 점검 결과를 확인합니다. check는 서버를 변경하지 않습니다.
3. 같은 화면에서 Run workflow → main → deploy → Run workflow.
4. 성공 요약에서 STUDENT_WIDGETS 생성·연결과 기존 설정 보존 확인을 읽습니다.
5. Cloudflare choi-river-notion의 바인딩에 RIVER_KV와 STUDENT_WIDGETS가 모두 있는지 확인합니다.
6. 휴대폰 위젯에서 새로고침합니다. 노션 위젯관리의 연결 기기 수·연결 상태·목록을 확인합니다. 웹 로그인만으로는 기기 수가 기록되지 않습니다.
7. 학생별 허용치만큼 연결한 뒤 다음 기기가 차단되는지 실제 기기로 확인합니다. 실제 연결 수를 대신 임의로 기입하지 않습니다.

## 배포가 하는 일

- 실제 서버 설정에서 RIVER_KV의 namespace ID를 읽어 같은 KV를 유지합니다. 새 KV를 만들지 않습니다.
- 기존 변수는 keep_vars로, 기존 Secrets는 Wrangler 기본 동작으로 보존합니다. Secret 원문은 읽거나 출력하지 않습니다.
- 기존 호환 날짜·플래그·예약 실행·workers.dev 설정을 사용합니다.
- StudentWidgetDevices를 SQLite Durable Object로 생성하고 STUDENT_WIDGETS로 연결합니다.
- 기존에 지원하지 않는 바인딩이 있거나 필수 인증 설정이 없으면 배포 전에 중단합니다.
- GitHub에 push할 때는 자동 검사만 실행합니다. 실제 서버 배포는 소유자가 Run workflow에서 deploy를 선택해야 실행합니다.

이 작업은 위젯 APK를 다시 만들지 않습니다. 새 서버가 적용되면 기존 위젯의 연결·새로고침 요청부터 관리 기능을 사용합니다. 실제 서버·휴대폰 검증은 배포 후 별도 확인이 필요합니다.

참고: repository의 wrangler.toml에는 실제 RIVER_KV ID가 없으므로 이 파일만으로 수동 배포하지 마세요. 이 workflow는 실제 서버 설정으로 임시 배포 설정을 만들고 실행 후 삭제합니다. 임시 설정 파일은 로그나 artifact로 공개하지 않습니다.
