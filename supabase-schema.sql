-- Supabase에서 실행할 테이블 생성 SQL
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

create table if not exists signatures (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  image_data text not null,
  created_at timestamptz default now() not null
);

-- RLS (Row Level Security) 활성화
alter table signatures enable row level security;

-- 누구나 서명을 추가할 수 있음
create policy "Anyone can insert signatures"
  on signatures for insert
  with check (true);

-- 누구나 서명을 조회할 수 있음 (관리자 인증은 앱 레벨에서 처리)
create policy "Anyone can read signatures"
  on signatures for select
  using (true);

-- 누구나 서명을 삭제할 수 있음 (관리자 인증은 앱 레벨에서 처리)
create policy "Anyone can delete signatures"
  on signatures for delete
  using (true);
