-- An exercise is measured one way: by duration or by count, never both. Two
-- nullable columns plus a discriminator allowed a contradictory row —
-- type='time' with both 45 seconds and 12 reps passed the old constraint and
-- the extra value sat there, silently ignored. One value plus its unit makes
-- that state unrepresentable rather than merely forbidden.
--
-- Hold times ("5 seconds at the top") are coaching cues, not measurements —
-- the app never counts them — so they live in `instructions` prose.

drop view if exists public.workout_exercises_resolved;
drop view if exists public.workout_summaries;

-- ------------------------------------------------------------- exercises
alter table public.exercises
  add column target_type  text,
  add column target_value int;

update public.exercises
set target_type  = default_type,
    target_value = coalesce(default_seconds, default_reps);

alter table public.exercises
  drop constraint default_target_matches_type,
  drop column default_type,
  drop column default_seconds,
  drop column default_reps,
  alter column target_type  set not null,
  alter column target_value set not null,
  add constraint target_type_known check (target_type in ('time','reps')),
  add constraint target_value_positive check (target_value > 0);

-- ----------------------------------------------------- workout_exercises
alter table public.workout_exercises
  add column target_type  text,
  add column target_value int;

update public.workout_exercises
set target_type  = type,
    target_value = coalesce(seconds, reps);

alter table public.workout_exercises
  drop column type,
  drop column seconds,
  drop column reps,
  add constraint override_type_known check (target_type is null or target_type in ('time','reps')),
  add constraint override_value_positive check (target_value is null or target_value > 0),
  -- An override sets both or neither; a unit without a number means nothing.
  add constraint override_is_complete check ((target_type is null) = (target_value is null));

-- ----------------------------------------------------------------- views
create view public.workout_exercises_resolved with (security_invoker = on) as
select we.id, we.workout_id, we.user_id, we.position, we.note, we.sets,
       e.id as exercise_id, e.name, e.kind, e.description, e.instructions, e.video_url,
       coalesce(we.target_type,  e.target_type)  as target_type,
       coalesce(we.target_value, e.target_value) as target_value,
       -- null here means "tracking the exercise default", which an editor shows
       we.target_type  as override_type,
       we.target_value as override_value
from public.workout_exercises we
join public.exercises e on e.id = we.exercise_id;

create view public.workout_summaries with (security_invoker = on) as
select w.id, w.user_id, w.name, w.description, w.days_of_week,
       w.rest_sec, w.position,
       count(we.id)::int as exercise_count,
       coalesce(sum(
         coalesce(we.sets, 1) *
         case when coalesce(we.target_type, e.target_type) = 'time'
              then coalesce(we.target_value, e.target_value)
              else coalesce(we.target_value, e.target_value) * 4   -- ~4s per rep
         end
       ), 0)::int as est_work_sec
from public.workouts w
left join public.workout_exercises we on we.workout_id = w.id
left join public.exercises e on e.id = we.exercise_id
group by w.id;

-- ------------------------------------------------------------- functions
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

  insert into public.workout_exercises
    (workout_id, user_id, exercise_id, position, target_type, target_value, sets, note)
  select target_workout,
         auth.uid(),
         (item->>'exercise_id')::uuid,
         (ord - 1)::int,
         nullif(item->>'target_type', ''),
         nullif(item->>'target_value', '')::int,
         nullif(item->>'sets', '')::int,
         nullif(item->>'note', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);
end;
$$;
