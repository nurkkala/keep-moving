-- seed_default_workout checked for existing workouts and then inserted, so two
-- overlapping first-run calls (React StrictMode in development, or two tabs)
-- could both seed. A transaction-scoped advisory lock per user makes the
-- second call wait, then find the first call's workout. Roadmap
-- OPEN-24-double-seed.
create or replace function public.seed_default_workout()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('seed_default_workout:' || auth.uid()::text, 0));

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
