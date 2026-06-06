# 편의점 시프트표 — 설정 & 배포 안내 (비개발자용)

직원들끼리 **링크 하나로 함께** 보고 수정하려면 두 가지가 필요해요.

1. **Supabase** — 모두의 데이터가 모이는 공용 데이터베이스 (무료)
2. **Vercel** — 앱을 인터넷에 올려 공유 링크를 만드는 곳 (무료)

아래 순서대로 천천히 따라오시면 됩니다. **클릭하셔야 하는 부분**만 적었어요.
(중간에 막히면 그 화면 그대로 저에게 말씀해 주세요.)

---

## 1부. Supabase 만들기 (약 5분)

### 1) 가입 & 프로젝트 생성
1. https://supabase.com 접속 → 오른쪽 위 **Start your project** (또는 Sign in)
2. **GitHub 또는 이메일**로 가입/로그인
3. **New project** 클릭
   - **Name**: 아무거나 (예: `convenience-shift`)
   - **Database Password**: 자동 생성된 것 사용하거나 아무거나 입력 → **꼭 따로 메모**
   - **Region**: `Northeast Asia (Seoul)` 추천 (한국에서 가장 빠름)
   - **Create new project** 클릭 → 1~2분 기다리면 준비 완료

### 2) 테이블 만들기 (복사 → 붙여넣기 → 실행)
1. 왼쪽 메뉴에서 **SQL Editor** (📄 아이콘) 클릭
2. **New query** (또는 빈 편집창) 선택
3. 같은 폴더의 **`supabase_setup.sql`** 파일을 열어 **전체 내용을 복사**
4. SQL 편집창에 **붙여넣기** 한 뒤, 오른쪽 아래 **RUN ▶** (또는 Ctrl+Enter)
5. "Success. No rows returned" 비슷한 메시지가 나오면 성공 ✅
   - 테이블 3개(`shifts`, `special_days`, `settings`)가 생기고, 실시간/권한까지 한 번에 설정돼요.

### 3) 연결 키 2개 복사하기
1. 왼쪽 아래 **Project Settings** (⚙️ 톱니바퀴) 클릭
2. **API** 또는 **API Keys** 메뉴 클릭
3. 다음 두 값을 복사해 둡니다:
   - **Project URL** → `https://xxxxxxxx.supabase.co` 형태
   - **anon public** 키 → `eyJhbGci...` 로 시작하는 아주 긴 문자열
   - ⚠️ `service_role` 키는 절대 쓰지 마세요(위험). 반드시 **anon public** 입니다.

> 이 두 값을 저(클로드)에게 알려주시면, `.env` 파일을 대신 만들어 드리고
> 바로 로컬에서 동작 확인까지 해드릴게요.
> (직접 하실 경우: `.env.example` 파일을 복사해 `.env` 로 이름 바꾸고 두 줄을 채우면 됩니다.)

---

## 2부. 인터넷에 올리기 — Vercel 배포 (약 5분)

먼저 코드를 GitHub에 올린 뒤 Vercel에 연결하는 방법이 가장 쉬워요.

### 1) GitHub에 코드 올리기
1. https://github.com 가입/로그인 → **New repository**
   - 이름 예: `convenience-shift` / Private 선택 가능 / **Create repository**
2. 그다음은 제가 명령어를 만들어 드릴게요. (git 설치만 되어 있으면 됩니다)
   - 혹시 git이 없다면 https://git-scm.com/download/win 에서 설치

### 2) Vercel 연결
1. https://vercel.com → **Continue with GitHub** 로 로그인
2. **Add New… → Project** → 방금 만든 저장소 **Import**
3. Framework는 자동으로 **Vite** 로 인식됩니다 (그대로 두기)
4. **Environment Variables** 펼치고 아래 2개 추가 (Supabase에서 복사한 값):
   - `VITE_SUPABASE_URL` = (Project URL)
   - `VITE_SUPABASE_ANON_KEY` = (anon public 키)
5. **Deploy** 클릭 → 1~2분 후 `https://convenience-shift.vercel.app` 같은 **공유 링크** 완성 🎉

---

## 3부. 폰에서 테스트 체크리스트

- [ ] 받은 링크를 **휴대폰 브라우저**(크롬/사파리)로 열기
- [ ] 매장 이름 눌러 변경 → 새로고침해도 유지되는지
- [ ] `+ 시프트` 로 카드 추가 → **다른 폰**에서도 몇 초 안에 보이는지 (실시간 ✅)
- [ ] 카드 눌러 수정/삭제
- [ ] `+ 특이사항` 추가
- [ ] 이전/다음 주 이동
- [ ] 하단 **근무 요약** 숫자 확인
- [ ] 즐겨찾기 또는 홈 화면에 추가해서 빠르게 열기

---

## 참고 — 보안 메모
지금은 **링크를 아는 누구나 편집 가능**하도록 열려 있어요(직원끼리 쓰기 편하게).
나중에 외부에 널리 공개하게 되면, 아무나 지울 수 있는 위험이 있으니
**"수정용 비밀 코드(매장 PIN)"** 같은 간단한 잠금을 추가하는 걸 권해드려요.
원하시면 그때 제가 붙여드리겠습니다.
