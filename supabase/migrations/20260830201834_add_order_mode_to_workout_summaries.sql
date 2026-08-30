-- workout_summaries is what the picker reads, and it omitted order_mode, so
-- every card would have silently fallen back to "straight" regardless.
drop view if exists public.workout_summaries;

create view public.workout_summaries with (security_invoker = on) as
select w.id, w.user_id, w.name, w.description, w.days_of_week, w.order_mode,
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
