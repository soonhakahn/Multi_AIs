# Multi AIs

질문 하나를 ChatGPT, Claude, Gemini, Perplexity, Grok, Kimi, Manus, Genspark에 동시에 보내고 답을 나란히 보는 개인용 도구입니다.
각 사이트에 **본인 계정으로 직접 로그인**해서 쓰므로 API 키나 별도 비용이 없고, 이 프로그램은 비밀번호를 다루지 않습니다.

## 1. 데스크톱 앱 (Windows / Mac)
- 한 창 안에 AI별 패널을 나란히 배치(바둑판 / 가로 한 줄 / 세로 한 줄)하고, 위쪽 입력창의 질문을 선택한 모든 AI에 한 번에 입력·전송합니다.
- 실행: `npm install && npm start`
- 설치 파일: GitHub → Actions → **Build desktop app** → Run workflow → 완료 후 Artifacts 다운로드(태그 `v*`를 푸시하면 Releases에도 올라갑니다).
  - Mac dmg는 서명되지 않아 처음 열 때 우클릭 → 열기가 필요하고, Windows는 SmartScreen 경고가 나올 수 있습니다.

## 2. iPhone용 발사대 (웹 페이지)
- `index.html`을 GitHub Pages로 공개합니다: Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
- 주소: https://soonhakahn.github.io/Multi_AIs/
- iPhone에서는 한 화면 분할이 불가능하므로 AI별로 열며, 질문 미리 채우기(`?q=`)를 지원하는 사이트는 자동 입력, 나머지는 질문을 복사해 붙여넣기 방식입니다.

## 개발
- `npm test` — 단위 테스트(레이아웃, 사이트 정의)
- `npm run test:e2e` — mock 사이트로 Electron 동작 검증(`xvfb-run` 필요)

## 알아둘 점
- 각 사이트의 화면 구조가 바뀌면 자동 입력이 실패할 수 있습니다(`shared/sites.mjs`의 선택자 수정).
- 기본으로 Claude, ChatGPT, Perplexity만 켜져 있습니다(위쪽 칩으로 추가).
- Google/Apple/Microsoft/GitHub 로그인은 앱 안에서 막히므로 시스템 브라우저로 넘깁니다. 앱 안에서는 각 사이트의 이메일 + 비밀번호로 로그인하세요(브라우저에서 로그인해도 앱에는 반영되지 않습니다).
- 자동화가 각 서비스 약관에 맞는지는 본인이 확인하세요.
