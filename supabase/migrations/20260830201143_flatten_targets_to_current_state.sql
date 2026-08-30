-- A target is state, not history: it answers "what am I aiming for today",
-- which has exactly one answer. The history of targets was redundant with
-- session_items, which already snapshots the target alongside the result
-- every time an exercise is actually performed — and a target you set but
-- never met is an intention, not an accomplishment. Progression is read from
-- what was done, not from what was planned.
drop view if exists public.target_progression;
drop view if exists public.workout_summaries;
drop view if exists public.workout_exercises_resolved;
drop view if exists public.current_exercise_targets;

-- Collapse any accumulated rows to the most recent per exercise.
delete from public.exercise_targets t
using public.exercise_targets newer
where t.user_id = newer.user_id
  and t.exercise_id = newer.exercise_id
  and (newer.effective_from, newer.created_at) > (t.effective_from, t.created_at);

alter table public.exercise_targets
  drop column effective_from,
  add column updated_at timestamptz not null default now(),
  add constraint one_target_per_exercise unique (user_id, exercise_id);

drop index if exists public.exercise_targets_current_idx;

-- ========================================================================= views
create view public.workout_exercises_resolved with (security_invoker = on) as
select we.id, we.workout_id, we.user_id, we.position, we.note,
       e.id as exercise_id, e.name, e.kind, e.description, e.instructions, e.video_url,
       coalesce(t.target_type,  e.suggested_type)  as target_type,
       coalesce(t.target_value, e.suggested_value) as target_value,
       coalesce(t.sets,         e.suggested_sets)  as sets,
       -- false means "still on the library's suggestion", which an editor shows
       t.exercise_id is not null as target_is_personal,
       t.updated_at as target_set_at
from public.workout_exercises we
join public.exercises e on e.id = we.exercise_id
left join public.exercise_targets t
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

-- ====================================================================== function
create or replace function public.set_exercise_target(
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
  on conflict (user_id, exercise_id) do update
    set target_type  = excluded.target_type,
        target_value = excluded.target_value,
        sets         = excluded.sets,
        note         = excluded.note,
        updated_at   = now()
  returning id into new_id;

  return new_id;
end;
$$;
