-- 인물 대화 평가 앱 초기 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 Run 하세요.

create extension if not exists "pgcrypto";

-- 교사가 만든 활동 (페르소나 + 학습 목표 + 루브릭)
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  persona_key text not null default 'kepler',
  learning_goals text not null,
  rubric jsonb not null,
  max_turns int not null default 20 check (max_turns between 3 and 50),
  join_code text not null unique,
  created_at timestamptz not null default now()
);

-- 학생 1명이 활동에 참여한 한 번의 대화
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  student_label text not null,
  status text not null default 'active' check (status in ('active', 'ended', 'evaluated')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  call_count int not null default 0
);
create index if not exists sessions_activity_id_idx on sessions(activity_id);

-- 대화의 모든 발화. turn_no 0 은 페르소나의 시작 멘트,
-- 1 이상은 학생 발화와 그에 대한 페르소나 응답이 같은 번호를 씁니다.
create table if not exists messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  turn_no int not null,
  role text not null check (role in ('student', 'persona')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (session_id, role, turn_no)
);
create index if not exists messages_session_id_idx on messages(session_id);

-- 평가 결과. 재평가하면 행이 추가되고 가장 최근 행을 씁니다.
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  status text not null check (status in ('ok', 'failed')),
  scores jsonb,
  total int,
  strengths text,
  next_questions jsonb,
  misconceptions jsonb,
  confidence text check (confidence in ('high', 'medium', 'low')),
  error text,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);
create index if not exists evaluations_session_id_idx on evaluations(session_id);

-- 모든 테이블에 RLS를 켜고 정책은 만들지 않습니다.
-- 브라우저(anon 키)로는 아무것도 읽거나 쓸 수 없고,
-- 서버(Vercel 함수)가 service role 키로만 접근합니다.
alter table activities enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table evaluations enable row level security;
