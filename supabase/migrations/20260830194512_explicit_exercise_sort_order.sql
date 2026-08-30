-- The ten starter exercises were inserted in one statement, so they all share
-- an identical created_at and the name tiebreaker sorted them alphabetically —
-- a seeded workout opened with squats and buried Child's pose in third place.
-- Give the library an explicit order instead of inferring one.
alter table public.exercises add column sort_order int not null default 100;

update public.exercises set sort_order = v.ord
from (values
  ('Neck rolls',1), ('Shoulder rolls',2), ('Cat cow',3),
  ('Left quad stretch',4), ('Right quad stretch',5),
  ('Bodyweight squats',6), ('Push ups',7), ('Glute bridges',8),
  ('Plank',9), ('Child''s pose',10)
) as v(name, ord)
where public.exercises.name = v.name and public.exercises.user_id is null;

create index exercises_sort_idx on public.exercises (sort_order, name);

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
