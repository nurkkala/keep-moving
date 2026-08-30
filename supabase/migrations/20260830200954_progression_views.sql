-- Every target you've ever set for an exercise, with what it replaced.
create view public.target_progression with (security_invoker = on) as
select t.user_id, t.exercise_id, e.name, e.kind,
       t.target_type, t.target_value, t.sets, t.effective_from, t.note,
       lag(t.target_value) over w  as previous_value,
       t.target_value - lag(t.target_value) over w as change,
       lead(t.effective_from) over w as superseded_at
from public.exercise_targets t
join public.exercises e on e.id = t.exercise_id
window w as (partition by t.user_id, t.exercise_id order by t.effective_from, t.created_at);

-- What you actually did, against what was asked, per exercise over time.
create view public.performance_history with (security_invoker = on) as
select si.user_id, si.exercise_id, si.name, si.kind,
       s.performed_at, s.workout_name,
       si.target_type, si.target_value, si.target_sets,
       si.actual_value, si.actual_sets, si.actual_sec, si.skipped,
       case
         when si.skipped then null
         when si.target_value is null or si.actual_value is null then null
         else si.actual_value >= si.target_value
       end as met_target
from public.session_items si
join public.sessions s on s.id = si.session_id;

-- Personal bests, which survive a target change because they're drawn from
-- what was done rather than what was prescribed.
create view public.exercise_bests with (security_invoker = on) as
select user_id, exercise_id, name, target_type,
       max(actual_value)          as best_value,
       max(actual_sets)           as best_sets,
       count(*)::int              as times_performed,
       max(performed_at)          as last_performed
from public.performance_history
where not skipped and actual_value is not null
group by user_id, exercise_id, name, target_type;
