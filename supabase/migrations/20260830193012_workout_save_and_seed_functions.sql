-- Replace one workout's exercise list atomically.
create function public.save_workout_exercises(target_workout uuid, items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- RLS already blocks other users' workouts; this makes the failure explicit.
  if not exists (
    select 1 from public.workouts w where w.id = target_workout and w.user_id = auth.uid()
  ) then
    raise exception 'Workout not found.';
  end if;

  delete from public.workout_exercises where workout_id = target_workout;

  insert into public.workout_exercises
    (workout_id, user_id, exercise_id, position, type, seconds, reps, sets, note)
  select target_workout,
         auth.uid(),
         (item->>'exercise_id')::uuid,
         (ord - 1)::int,
         nullif(item->>'type', ''),
         nullif(item->>'seconds', '')::int,
         nullif(item->>'reps', '')::int,
         nullif(item->>'sets', '')::int,
         nullif(item->>'note', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);
end;
$$;

-- First run: one weekday workout built from the shared library.
create function public.seed_default_workout()
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
         (row_number() over (order by e.created_at, e.name) - 1)::int
  from public.exercises e
  where e.user_id is null;

  return new_id;
end;
$$;

-- Sessions now remember which workout they came from, by id and by name.
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
    (session_id, user_id, exercise_id, position, name, kind, actual_sec, skipped, how)
  select new_id,
         auth.uid(),
         nullif(item->>'exercise_id', '')::uuid,
         (ord - 1)::int,
         item->>'name',
         item->>'kind',
         coalesce((item->>'actual')::int, 0),
         coalesce((item->>'skipped')::boolean, false),
         nullif(item->>'how', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);

  return new_id;
end;
$$;

drop function if exists public.save_session(int, jsonb);
