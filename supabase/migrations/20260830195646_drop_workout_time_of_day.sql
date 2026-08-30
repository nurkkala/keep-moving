-- time_of_day was never read by anything. Nothing prompts or notifies at a
-- set time, so storing one made the app look like it would. Dropped rather
-- than left as an unkept promise.
drop view if exists public.workout_summaries;

alter table public.workouts drop column time_of_day;

create view public.workout_summaries with (security_invoker = on) as
select w.id, w.user_id, w.name, w.description, w.days_of_week,
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
