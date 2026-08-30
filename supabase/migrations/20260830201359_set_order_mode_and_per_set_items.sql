-- How a workout is executed: all sets of one exercise before moving on, or
-- one set of each in rotation. Total work is identical either way — only the
-- order changes — so estimates and totals are unaffected.
--
-- Circuit mode breaks the old assumption that one exercise is one contiguous
-- block. Its sets happen at different times, separated by other exercises, so
-- a session item becomes one row per SET rather than per exercise. That also
-- captures decay across sets (12, 10, 8), which a single averaged row lost.

alter table public.workouts
  add column order_mode text not null default 'straight'
    check (order_mode in ('straight','circuit'));

comment on column public.workouts.order_mode is
  'straight = all sets of an exercise together; circuit = one set of each, in
   rotation. In circuit mode the number of rounds is the largest set count in
   the workout, and an exercise drops out once its own sets are done.';

-- Snapshot how the session was actually run.
alter table public.sessions
  add column order_mode text check (order_mode in ('straight','circuit'));

-- ------------------------------------------------- session items become sets
drop view if exists public.exercise_bests;
drop view if exists public.performance_history;

alter table public.session_items
  add column set_number int not null default 1 check (set_number > 0),
  drop column actual_sets;

comment on column public.session_items.position is
  'Order performed within the session. In a circuit this interleaves
   exercises, so it is not the workout''s exercise order.';
comment on column public.session_items.set_number is
  'Which set of this exercise, counting from 1.';

create index session_items_exercise_idx
  on public.session_items (user_id, exercise_id);

-- ========================================================================= views
create view public.performance_history with (security_invoker = on) as
select si.user_id, si.exercise_id, si.name, si.kind,
       s.performed_at, s.workout_name, s.order_mode,
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

-- One row per exercise per session: what the History screen shows.
create view public.session_exercise_totals with (security_invoker = on) as
select user_id, exercise_id, name, kind, performed_at, workout_name, target_type,
       min(target_value)                            as target_value,
       max(target_sets)                             as target_sets,
       count(*) filter (where not skipped)::int     as sets_done,
       sum(actual_value) filter (where not skipped) as total_value,
       max(actual_value) filter (where not skipped) as best_set,
       sum(actual_sec)                              as total_sec,
       bool_and(coalesce(met_target, false))        as met_every_set
from public.performance_history
group by user_id, exercise_id, name, kind, performed_at, workout_name, target_type;

-- Personal bests, drawn from what was done so they survive any target change.
create view public.exercise_bests with (security_invoker = on) as
select user_id, exercise_id, name, target_type,
       max(actual_value)                   as best_set,
       max(performed_at)                   as last_performed,
       count(*)::int                       as sets_performed,
       count(distinct performed_at)::int   as times_performed
from public.performance_history
where not skipped and actual_value is not null
group by user_id, exercise_id, name, target_type;
