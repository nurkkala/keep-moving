-- A session item now records what was asked for and what was done. The target
-- is snapshotted alongside the result, so raising a target later never
-- retroactively turns a past success into a shortfall.
alter table public.session_items
  add column target_type  text check (target_type is null or target_type in ('time','reps')),
  add column target_value int check (target_value is null or target_value > 0),
  add column target_sets  int check (target_sets  is null or target_sets  > 0),
  -- Performance in the target's own unit: reps completed, or seconds held.
  add column actual_value int check (actual_value is null or actual_value >= 0),
  add column actual_sets  int check (actual_sets  is null or actual_sets  >= 0);

comment on column public.session_items.actual_sec is
  'Wall-clock time spent on this exercise, whatever its unit. For a reps
   exercise this is how long the set took; for a time exercise it equals
   actual_value.';
comment on column public.session_items.actual_value is
  'Performance measured in the target''s unit: reps completed for a reps
   exercise, seconds held for a time exercise.';

-- ==================================================================== functions

-- Setting a target appends; it never updates. The previous row remains as
-- history, which is what makes progression visible.
create function public.set_exercise_target(
  target_exercise uuid,
  new_type text,
  new_value int,
  new_sets int default 1,
  new_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.exercise_targets
    (user_id, exercise_id, target_type, target_value, sets, note)
  values (auth.uid(), target_exercise, new_type, new_value, new_sets, new_note)
  returning id into new_id;

  return new_id;
end;
$$;

-- Workout slots hold position and a note now; the target lives elsewhere.
create or replace function public.save_workout_exercises(target_workout uuid, items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workouts w where w.id = target_workout and w.user_id = auth.uid()
  ) then
    raise exception 'Workout not found.';
  end if;

  delete from public.workout_exercises where workout_id = target_workout;

  insert into public.workout_exercises (workout_id, user_id, exercise_id, position, note)
  select target_workout,
         auth.uid(),
         (item->>'exercise_id')::uuid,
         (ord - 1)::int,
         nullif(item->>'note', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);
end;
$$;

create or replace function public.save_session(
  total_sec int,
  items jsonb,
  target_workout uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  wname  text;
begin
  select w.name into wname from public.workouts w
  where w.id = target_workout and w.user_id = auth.uid();

  insert into public.sessions (user_id, total_sec, workout_id, workout_name)
  values (auth.uid(), total_sec, target_workout, wname)
  returning id into new_id;

  insert into public.session_items
    (session_id, user_id, exercise_id, position, name, kind,
     target_type, target_value, target_sets,
     actual_value, actual_sets, actual_sec, skipped, how)
  select new_id,
         auth.uid(),
         nullif(item->>'exercise_id', '')::uuid,
         (ord - 1)::int,
         item->>'name',
         item->>'kind',
         nullif(item->>'target_type', ''),
         nullif(item->>'target_value', '')::int,
         nullif(item->>'target_sets', '')::int,
         nullif(item->>'actual_value', '')::int,
         nullif(item->>'actual_sets', '')::int,
         coalesce((item->>'actual')::int, 0),
         coalesce((item->>'skipped')::boolean, false),
         nullif(item->>'how', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);

  return new_id;
end;
$$;

-- New users start on the library's suggestions; a target row is written only
-- when they actually change something.
create or replace function public.seed_default_workout()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if exists (select 1 from public.workouts where user_id = auth.uid()) then
    select id into new_id from public.workouts
    where user_id = auth.uid() order by position, created_at limit 1;
    return new_id;
  end if;

  insert into public.workouts (user_id, name, description, days_of_week)
  values (auth.uid(), 'Daily mobility',
          'Stretch, strength, and core. Built from the starter library — edit freely.',
          array[1,2,3,4,5]::smallint[])
  returning id into new_id;

  insert into public.workout_exercises (workout_id, user_id, exercise_id, position)
  select new_id, auth.uid(), e.id,
         (row_number() over (order by e.sort_order, e.name) - 1)::int
  from public.exercises e
  where e.user_id is null;

  return new_id;
end;
$$;
