-- Per-user voice + pacing preferences (one row per user)
create table public.preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  voice_uri  text,
  voice_name text,
  rate       numeric not null default 1 check (rate between 0.5 and 2),
  rest_sec   int     not null default 15 check (rest_sec between 0 and 300),
  updated_at timestamptz not null default now()
);

-- The user's editable routine, ordered by position
create table public.routine_exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  position   int  not null,
  name       text not null,
  kind       text not null check (kind in ('stretch','strength','core','cardio')),
  type       text not null check (type in ('time','reps')),
  seconds    int check (seconds > 0),
  reps       int check (reps > 0),
  cue        text,
  created_at timestamptz not null default now(),
  constraint target_matches_type check (
    (type = 'time' and seconds is not null) or
    (type = 'reps' and reps is not null)
  )
);
create index routine_exercises_user_pos_idx on public.routine_exercises (user_id, position);

-- One row per completed session
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  performed_at timestamptz not null default now(),
  total_sec    int not null default 0 check (total_sec >= 0)
);
create index sessions_user_date_idx on public.sessions (user_id, performed_at desc);

-- What actually happened in each session
create table public.session_items (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  position   int  not null,
  name       text not null,
  kind       text not null check (kind in ('stretch','strength','core','cardio')),
  actual_sec int  not null default 0 check (actual_sec >= 0),
  skipped    boolean not null default false,
  how        text check (how in ('timer','voice','tap','skipped'))
);
create index session_items_session_idx on public.session_items (session_id);
create index session_items_user_kind_idx on public.session_items (user_id, kind);

-- Row level security: every table is scoped to the signed-in user
alter table public.preferences       enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.sessions          enable row level security;
alter table public.session_items     enable row level security;

create policy "own preferences" on public.preferences
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own routine" on public.routine_exercises
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sessions" on public.sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own session items" on public.session_items
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- All-time minutes per category, for the History tab
create view public.kind_totals with (security_invoker = on) as
  select user_id, kind, sum(actual_sec)::int as total_sec, count(*)::int as reps_done
  from public.session_items
  where not skipped
  group by user_id, kind;
