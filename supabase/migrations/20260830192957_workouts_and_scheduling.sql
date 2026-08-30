-- ==================================================================== workouts
-- days_of_week uses JavaScript's convention: 0 = Sunday … 6 = Saturday,
-- so it lines up with Date.getDay() without translation.
create table public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  description  text,
  days_of_week smallint[] not null default '{}',
  time_of_day  time,
  rest_sec     int check (rest_sec between 0 and 300),  -- null = use preferences
  starts_on    date,
  ends_on      date,
  archived     boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  constraint days_are_valid check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  constraint ends_after_start check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index workouts_user_idx on public.workouts (user_id, position);
create index workouts_days_idx on public.workouts using gin (days_of_week);

-- ======================================= routine_exercises becomes per-workout
drop view if exists public.routine_resolved;
drop function if exists public.save_routine(jsonb);
drop function if exists public.seed_default_routine();
drop table public.routine_exercises;

create table public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position    int  not null,
  -- All null = use the exercise's defaults. Set to override in this workout.
  type        text check (type in ('time','reps')),
  seconds     int check (seconds > 0),
  reps        int check (reps > 0),
  sets        int check (sets > 0),
  note        text,
  created_at  timestamptz not null default now()
);
create index workout_exercises_workout_idx on public.workout_exercises (workout_id, position);

-- A session records which workout was performed, if any.
alter table public.sessions
  add column workout_id   uuid references public.workouts(id) on delete set null,
  add column workout_name text;

-- ============================================================================ RLS
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;

create policy "own workouts" on public.workouts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own workout exercises" on public.workout_exercises
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========================================================================= views
create view public.workout_exercises_resolved with (security_invoker = on) as
select we.id, we.workout_id, we.user_id, we.position, we.note, we.sets,
       e.id as exercise_id, e.name, e.kind, e.description, e.instructions, e.video_url,
       coalesce(we.type,    e.default_type)    as type,
       coalesce(we.seconds, e.default_seconds) as seconds,
       coalesce(we.reps,    e.default_reps)    as reps,
       -- what the slot itself overrides, so an editor can show defaults vs. changes
       we.type as override_type, we.seconds as override_seconds, we.reps as override_reps
from public.workout_exercises we
join public.exercises e on e.id = we.exercise_id;

-- Workout list with a rough duration estimate, for the picker screen.
create view public.workout_summaries with (security_invoker = on) as
select w.id, w.user_id, w.name, w.description, w.days_of_week, w.time_of_day,
       w.rest_sec, w.starts_on, w.ends_on, w.archived, w.position,
       count(we.id)::int as exercise_count,
       coalesce(sum(
         coalesce(we.sets, 1) *
         case when coalesce(we.type, e.default_type) = 'time'
              then coalesce(we.seconds, e.default_seconds)
              else coalesce(we.reps, e.default_reps) * 4   -- ~4s per rep
         end
       ), 0)::int as est_work_sec
from public.workouts w
left join public.workout_exercises we on we.workout_id = w.id
left join public.exercises e on e.id = we.exercise_id
group by w.id;
