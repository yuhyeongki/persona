# 인물 대화 평가 앱 (MVP)

학생이 가상의 인물(케플러)과 대화하고, 대화가 끝나면 AI가 루브릭으로 "얼마나 잘 대화했는지"를 평가해 주는 수업용 웹앱입니다.

- 프레임워크: Next.js 15 (App Router, TypeScript)
- DB: Supabase (Postgres)
- AI: Google Gemini API (REST 직접 호출, SDK 없음)
- 배포: Vercel

## 동작 방식

1. 교사가 `/teacher` 에서 활동을 만들면 6자리 접속 코드가 나옵니다.
2. 학생이 `/` 에서 코드와 이름을 입력해 입장하고, 케플러와 대화합니다. (질문 횟수 제한 있음)
3. 학생이 "대화 마치기"를 누르거나 제한에 도달하면 평가가 실행됩니다. 4개 항목(질문의 구체성, 근거 활용과 추론, 개념 정확성, 대화 이어가기)을 1~4점으로 채점하고, 점수마다 근거 발언의 턴 번호를 인용합니다.
4. 학생은 자기 결과를, 교사는 `/teacher` 에서 학생별 결과와 대화 전문을 봅니다.

```
app/
  page.tsx                      학생 입장 (접속 코드, 이름)
  chat/[sessionId]/             대화 화면
  result/[sessionId]/           결과 화면 (평가가 없으면 자동 실행)
  teacher/                      교사 로그인, 활동 만들기, 활동별 결과, 대화 전문
  api/join, chat, end           입장 / 대화 / 종료·평가
  api/teacher/login, activity   교사 로그인 / 활동 생성
lib/
  personas/kepler.ts            케플러 페르소나와 시스템 프롬프트
  rubric.ts                     기본 루브릭 4항목
  evaluate.ts                   평가 프롬프트, JSON 검증, 1회 재시도
  gemini.ts                     Gemini 호출
  supabase.ts                   서버 전용 Supabase 클라이언트
supabase/migrations/0001_init.sql   테이블 4개 + RLS
```

## 설정 순서

### 1. Supabase

1. [supabase.com](https://supabase.com) 에서 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴 **SQL Editor** 에서 `supabase/migrations/0001_init.sql` 의 내용을 통째로 붙여 넣고 **Run** 합니다. (테이블 4개가 생깁니다.)
3. **Project Settings → API** (또는 API Keys) 에서 두 값을 복사해 둡니다.
   - Project URL → `SUPABASE_URL`
   - `service_role` 키 (새 방식의 키 화면에서는 secret 키) → `SUPABASE_SERVICE_ROLE_KEY`

> service_role 키는 모든 권한을 가진 키입니다. 서버 환경변수에만 넣고, 이름 앞에 `NEXT_PUBLIC_` 을 붙이거나 GitHub에 올리지 마세요.

### 2. Gemini API 키

[Google AI Studio](https://aistudio.google.com/apikey) 에서 API 키를 발급해 `GEMINI_API_KEY` 로 씁니다.
모델 이름은 `GEMINI_MODEL` 로 바꿀 수 있고, 생략하면 `gemini-3.8-flash` 를 씁니다.
기본 모델이 혼잡(503)하거나 한도(429), 20초 이상 무응답일 때는 `GEMINI_FALLBACK_MODEL`(기본 `gemini-3.5-flash-lite`)로 자동 전환합니다. 빈 값으로 두면 전환하지 않습니다.

### 3. 내 컴퓨터에서 먼저 실행해 보기

```bash
cd persona-chat-eval
cp .env.example .env.local      # 열어서 값 채우기
npm install
npm run dev                     # http://localhost:3000
```

`/teacher` 에서 `TEACHER_PASSWORD` 로 로그인 → 활동 만들기 → 다른 창에서 `/` 로 입장해 대화 → 대화 마치기 순서로 확인하세요.

### 4. GitHub에 올리기

GitHub에서 새 저장소(비공개 권장)를 만든 뒤:

```bash
cd persona-chat-eval
git init
git add .
git commit -m "init: 인물 대화 평가 앱"
git branch -M main
git remote add origin https://github.com/<내 아이디>/<저장소 이름>.git
git push -u origin main
```

`.env.local` 은 `.gitignore` 에 들어 있어 올라가지 않습니다.

### 5. Vercel에 연결하기

1. [vercel.com](https://vercel.com) → **Add New → Project** → 방금 올린 GitHub 저장소를 Import 합니다. (Next.js로 자동 인식됩니다.)
2. **Environment Variables** 에 아래 값을 넣고 **Deploy** 합니다.

| 이름 | 값 |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 |
| `GEMINI_API_KEY` | Gemini API 키 |
| `GEMINI_MODEL` | (선택) 모델 이름 |
| `TEACHER_PASSWORD` | 교사 비밀번호 (길고 추측하기 어렵게) |

3. 이후 `main` 에 push 할 때마다 자동으로 다시 배포됩니다. 환경변수를 바꾼 뒤에는 Redeploy 해야 반영됩니다.

## 설계서와 달라진 점 (MVP 단순화)

- **접근 제어**: 설계서에는 교사 계정 RLS와 학생 익명 로그인이 있었지만, MVP는 모든 테이블에 RLS를 켜고 정책을 만들지 않아 브라우저에서는 DB에 접근할 수 없고, 서버(API)만 service role 키로 읽고 씁니다. 학생은 로그인 없이 입장 시 받는 세션 주소(추측할 수 없는 UUID)로 자기 결과만 봅니다. 교사는 비밀번호 하나로 로그인합니다. 교사 계정이 여러 명 필요해지면 Supabase Auth를 붙이면 됩니다.
- **테이블**: `activities` 에 `teacher_id` 가 없습니다. 위 이유로 교사 계정을 나누지 않았기 때문입니다.
- **페르소나**: 케플러 1명이 코드(`lib/personas/kepler.ts`)에 고정되어 있고, 학습 목표·질문 횟수만 활동마다 바꿀 수 있습니다.
- **구조화 출력**: Gemini의 JSON 스키마 기능 대신 `responseMimeType: application/json` 과 서버 쪽 검증(+1회 재시도)을 씁니다. 검증은 항목 누락, 점수 범위, 근거 턴 번호를 확인합니다.

## 알아 둘 점

- **개인정보**: 학생 이름은 번호나 별칭으로 받는 것을 권장합니다. Gemini API를 무료로 쓰면 약관상 입력 내용이 서비스 개선에 쓰일 수 있으니, 학교 정책과 현재 약관을 확인하고 쓰세요.
- **비용·남용**: 학생 1명당 질문 횟수(기본 20), 한 번에 500자 제한이 서버에서 적용됩니다. 교사 로그인에는 횟수 제한이 없으니 비밀번호를 길게 정하세요.
- **평가 신뢰도**: AI 점수는 참고 자료입니다. 대화가 3턴 미만이거나 근거 없는 점수가 있으면 결과 화면에 "참고용"으로 표시되고, 교사 화면에서 대화 전문과 인용된 근거 발언을 함께 확인할 수 있습니다.
- **함수 실행 시간**: 대화·평가 API는 최대 60초로 설정되어 있습니다(`maxDuration`). 플랜에 따라 더 짧게 제한될 수 있습니다.

## 문제 해결

- Gemini 호출이 404 / 모델 없음 → `GEMINI_MODEL` 을 현재 사용 가능한 모델 이름으로 바꾸세요.
- "평가에 실패했습니다" → 교사 화면의 해당 학생 페이지 아래에 마지막 오류가 표시됩니다. 학생 결과 화면의 "평가 다시 시도" 버튼으로 재평가할 수 있습니다.
- 입장할 때 오류 → Supabase 환경변수와 SQL 실행 여부를 확인하세요.

## 다음 단계 (설계서의 2차 항목)

교사용 페르소나 편집기, 루브릭 편집기, 여러 인물 지원, 반 전체 통계 확장, 부적절 발화 감지 알림.
