메소로그 서버 (넥슨 API 프록시)
메소로그 사이트에서 캐릭터 전투력을 자동으로 불러오기 위한 작은 서버예요.
API 키를 안전하게 숨기고, 브라우저의 CORS 제한을 우회하는 역할만 해요.
1. 넥슨 API 키 발급 (5분)
https://openapi.nexon.com 접속 후 넥슨 아이디로 로그인
마이페이지 → Nexon Open API → 애플리케이션 등록
게임: 메이플스토리 / 개발 환경: WEB / URL은 아직 없으면 대충 아무 URL이나 입력해도 돼요
등록 후 애플리케이션 상세 페이지에서 API 키 확인
2. 로컬에서 먼저 테스트해보기
```bash
npm install
cp .env.example .env
# .env 파일을 열어서 NEXON_API_KEY에 방금 발급받은 키를 붙여넣기
npm start
```
브라우저에서 아래 주소로 들어가서 잘 나오는지 확인:
```
http://localhost:3000/api/character?name=본인캐릭터명
```
3. 무료로 배포하기 (Render.com 기준)
이 폴더를 GitHub 저장소로 올리기 (private 저장소로 올려도 됨 — API 키는 코드에 없고 환경변수로만 넣으니 안전해요)
https://render.com 가입 → New → Web Service → 방금 만든 저장소 선택
설정값:
Build Command: `npm install`
Start Command: `npm start`
Instance Type: Free
Environment 탭에서 환경 변수 추가:
`NEXON_API_KEY` = 발급받은 키
`ALLOWED_ORIGIN` = 메소로그 사이트를 여는 주소 (모르겠으면 일단 `*`로 두고 나중에 좁혀도 됨)
배포 완료되면 `https://xxxx.onrender.com` 같은 주소가 생겨요 — 이 주소를 메소로그 사이트의 "서버 주소" 설정칸에 입력하면 끝
> 참고: Render 무료 플랜은 15분간 요청이 없으면 서버가 잠들어요. 다음 요청 때 10~30초 정도 깨어나는 시간이 걸릴 수 있어요. 빠른 응답이 계속 필요하면 Railway나 유료 플랜을 고려해보세요.
4. 다른 무료 호스팅 옵션
Railway (railway.app) — Render와 거의 동일한 방식, 월 소액 무료 크레딧 제공
Fly.io — 무료 티어 있음, 설정이 조금 더 복잡함
어떤 걸 쓰든 핵심은 동일해요: `NEXON_API_KEY`를 서버 환경 변수로만 넣고, 코드나 프론트엔드에는 절대 직접 넣지 않는 것.
5. 여러 PC에서 같은 기록 보기 (동기화 코드 설정)
수익 기록을 어느 PC(PC방 포함)에서든 이어서 보려면, Upstash Redis라는 무료 클라우드 저장소를 하나 더 연결해야 해요.
https://upstash.com 접속 → 무료 가입 (GitHub 계정으로 바로 가입 가능)
콘솔에서 Create Database 클릭 → 이름 아무거나 입력, Region은 아무거나(가까운 지역 추천) → 생성
만들어진 데이터베이스 상세 페이지에서 아래로 스크롤하면 REST API 섹션이 있어요. 여기 있는:
`UPSTASH_REDIS_REST_URL`
`UPSTASH_REDIS_REST_TOKEN`
이 두 값을 복사해서, Render의 Environment 변수에 똑같은 이름으로 추가해주세요.
저장하면 Render가 자동으로 재배포돼요.
메소로그 사이트의 "캐릭터 / 서버 설정"에서 동기화 코드를 하나 정해서 입력해요 (예: 본인만 아는 문자열, `아이젠하르트sync` 같은 걸로). 다른 PC에서도 서버 주소 + 이 동기화 코드를 똑같이 입력하면 같은 기록이 보여요.
> 동기화 코드는 비밀번호처럼 남들이 맞히기 어려운 걸로 정하는 게 좋아요. 이 코드를 아는 사람은 누구나 같은 기록을 보고 수정할 수 있어요.
API 사용법
```
GET /api/character?name=캐릭터명

응답 예시:
{
  "name": "아이젠하르트",
  "level": 285,
  "job": "히어로",
  "guild": "메이플길드",
  "world": "스카니아",
  "combatPower": 1234567890,
  "imageUrl": "https://...",
  "cached": false
}
```
같은 캐릭터는 5분 동안 캐시되어서, 넥슨 API를 너무 자주 호출하지 않도록 되어 있어요.
