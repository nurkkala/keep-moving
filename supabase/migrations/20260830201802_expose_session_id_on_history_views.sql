-- Without session_id, the client had to match rollup rows back to sessions on
-- performed_at — a timestamp join that would collide for two sessions saved in
-- the same instant. Expose the key instead.
drop view if exists public.exercise_bests;
drop view if exists public.session_exercise_totals;
drop view if exists public.performance_history;

create view public.performance_history with (security_invoker = on) as
select si.session_id, si.user_id, si.exercise_id, si.name, si.kind,
       s.performed_at, s.workout_id, s.workout_name, s.order_mode,
       si.position, si.set_number,
       si.target_type, si.target_value, si.target_sets,
       si.actual_value, si.actual_sec, si.skipped, si.how,
       case
         when si.skipped then null
         when si.target_value is null or si.actual_value is null then null
         else si.actual_value >= si.target_value
       end as met_target
from public.session_items si
join public.sessions s on s.id = si.session_id;

create view public.session_exercise_totals with (security_invoker = on) as
select session_id, user_id, exercise_id, name, kind, performed_at,
       workout_name, target_type,
       min(position)                                as first_position,
       min(target_value)                            as target_value,
       max(target_sets)                             as target_sets,
       count(*) filter (where not skipped)::int     as sets_done,
       sum(actual_value) filter (where not skipped) as total_value,
       max(actual_value) filter (where not skipped) as best_set,
       sum(actual_sec)                              as total_sec,
       bool_and(coalesce(met_target, false))        as met_every_set
from public.performance_history
group by session_id, user_id, exercise_id, name, kind, performed_at,
         workout_name, target_type;

create view public.exercise_bests with (security_invoker = on) as
select user_id, exercise_id, name, target_type,
       max(actual_value)                 as best_set,
       max(performed_at)                 as last_performed,
       count(*)::int                     as sets_performed,
       count(distinct session_id)::int   as times_performed
from public.performance_history
where not skipped and actual_value is not null
group by user_id, exercise_id, name, target_type;
