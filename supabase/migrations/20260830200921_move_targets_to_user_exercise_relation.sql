-- A target is inherently somebody's. "Plank" is universal; "45 seconds of
-- plank" is one person's, this month. Holding the target on `exercises` was
-- what stopped the library from being genuinely shared.
--
-- Targets move to a user x exercise relation, append-only: raising a target
-- inserts a row rather than overwriting, so progression is readable from the
-- table itself and no past prescription is destroyed.

drop view if exists public.workout_exercises_resolved;
drop view if exists public.workout_summaries;

-- ------------------------------------------- exercises become definitional
-- What's left on the exercise is the library's *recommendation* — a starting
-- point for someone who has never done it. It is not anyone's target.
alter table public.exercises
  rename column target_type to suggested_type;
alter table public.exercises
  rename column target_value to suggested_value;

alter table public.exercises
  rename constraint target_type_known to suggested_type_known;
alter table public.exercises
  rename constraint target_value_positive to suggested_value_positive;

alter table public.exercises
  add column suggested_sets int not null default 1 check (suggested_sets > 0);

-- ------------------------------------------------ the user's actual target
create table public.exercise_targets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  exercise_id    uuid not null references public.exercises(id) on delete cascade,
  target_type    text not null check (target_type in ('time','reps')),
  target_value   int  not null check (target_value > 0),
  sets           int  not null default 1 check (sets > 0),
  effective_from timestamptz not null default now(),
  note           text,
  created_at     timestamptz not null default now()
);
-- Newest first per exercise: the current target is one index seek away.
create index exercise_targets_current_idx
  on public.exercise_targets (user_id, exercise_id, effective_from desc);

-- --------------------------------- workout slots no longer carry a target
alter table public.workout_exercises
  drop constraint override_type_known,
  drop constraint override_value_positive,
  drop constraint override_is_complete,
  drop column target_type,
  drop column target_value,
  drop column sets;

-- ============================================================================ RLS
alter table public.exercise_targets enable row level security;

create policy "own targets" on public.exercise_targets
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========================================================================= views
-- The latest target per exercise. Older rows stay put as the progression.
create view public.current_exercise_targets with (security_invoker = on) as
select distinct on (user_id, exercise_id)
       user_id, exercise_id, target_type, target_value, sets, effective_from, note
from public.exercise_targets
order by user_id, exercise_id, effective_from desc, created_at desc;

-- A workout slot resolves to the user's current target, or the library's
-- suggestion if they've never set one.
create view public.workout_exercises_resolved with (security_invoker = on) as
select we.id, we.workout_id, we.user_id, we.position, we.note,
       e.id as exercise_id, e.name, e.kind, e.description, e.instructions, e.video_url,
       coalesce(t.target_type,  e.suggested_type)  as target_type,
       coalesce(t.target_value, e.suggested_value) as target_value,
       coalesce(t.sets,         e.suggested_sets)  as sets,
       t.effective_from as target_set_at,
       -- false means "still on the library's suggestion", which an editor shows
       t.exercise_id is not null as target_is_personal
from public.workout_exercises we
join public.exercises e on e.id = we.exercise_id
left join public.current_exercise_targets t
       on t.exercise_id = we.exercise_id and t.user_id = we.user_id;

create view public.workout_summaries with (security_invoker = on) as
select w.id, w.user_id, w.name, w.description, w.days_of_week,
       w.rest_sec, w.position,
       count(r.id)::int as exercise_count,
       coalesce(sum(
         r.sets * case when r.target_type = 'time'
                       then r.target_value
                       else r.target_value * 4   -- ~4s per rep
                  end
       ), 0)::int as est_work_sec
from public.workouts w
left join public.workout_exercises_resolved r on r.workout_id = w.id
group by w.id;
