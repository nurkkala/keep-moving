-- A workout slot is now either a specific exercise or a rule: "two exercises
-- tagged arms". The rule is resolved when a session starts, so the same
-- workout varies week to week without the user editing anything.
--
-- Tags on a rule are ANDed: two tags means an exercise must carry both. A
-- single tag is the common case and behaves the obvious way.

drop view if exists public.workout_summaries;
drop view if exists public.workout_exercises_resolved;

alter table public.workout_exercises
  alter column exercise_id drop not null,
  add column pick_count int check (pick_count > 0 and pick_count <= 10),
  add constraint slot_is_exercise_or_rule check (
    (exercise_id is not null and pick_count is null) or
    (exercise_id is null     and pick_count is not null)
  );

comment on column public.workout_exercises.pick_count is
  'Set only on rule slots: how many matching exercises to choose at session
   start. Mutually exclusive with exercise_id.';

create table public.workout_slot_tags (
  slot_id  uuid not null references public.workout_exercises(id) on delete cascade,
  value_id uuid not null references public.attribute_values(id) on delete cascade,
  primary key (slot_id, value_id)
);

alter table public.workout_slot_tags enable row level security;

create policy "own slot tags" on public.workout_slot_tags
  for all to authenticated
  using (exists (
    select 1 from public.workout_exercises we
    where we.id = slot_id and we.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_exercises we
    where we.id = slot_id and we.user_id = auth.uid()
  ));

-- ========================================================================= views
-- Fixed slots only. Rule slots resolve per session, so they can't live here.
create view public.workout_exercises_resolved with (security_invoker = on) as
select we.id, we.workout_id, we.user_id, we.position, we.note, we.pick_count,
       e.id as exercise_id, e.name, e.kind, e.description, e.instructions, e.video_url,
       coalesce(t.target_type,  e.suggested_type)  as target_type,
       coalesce(t.target_value, e.suggested_value) as target_value,
       coalesce(t.sets,         e.suggested_sets)  as sets,
       t.exercise_id is not null as target_is_personal,
       t.updated_at as target_set_at
from public.workout_exercises we
join public.exercises e on e.id = we.exercise_id
left join public.exercise_targets t
       on t.exercise_id = we.exercise_id and t.user_id = we.user_id;

-- What a rule slot is asking for, in words: "2 × Arms, Strength"
create view public.workout_slot_rules with (security_invoker = on) as
select we.id as slot_id, we.workout_id, we.user_id, we.position, we.pick_count, we.note,
       string_agg(v.label, ' + ' order by v.label) as rule_label,
       count(v.id)::int as tag_count
from public.workout_exercises we
left join public.workout_slot_tags st on st.slot_id = we.id
left join public.attribute_values v on v.id = st.value_id
where we.pick_count is not null
group by we.id;

create view public.workout_summaries with (security_invoker = on) as
select w.id, w.user_id, w.name, w.description, w.days_of_week, w.order_mode,
       w.rest_sec, w.position,
       (select count(*) from public.workout_exercises we where we.workout_id = w.id)::int
         as slot_count,
       (select coalesce(sum(coalesce(we.pick_count, 1)), 0)
        from public.workout_exercises we where we.workout_id = w.id)::int
         as exercise_count,
       coalesce((
         select sum(r.sets * case when r.target_type = 'time'
                                  then r.target_value
                                  else r.target_value * 4 end)
         from public.workout_exercises_resolved r where r.workout_id = w.id
       ), 0)::int as est_work_sec
from public.workouts w;
