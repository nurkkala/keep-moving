-- Walking, running, and cycling are measured by distance. This fits the
-- existing one-value-one-unit model without a second number: target_value
-- holds METRES, and actual_sec already records how long it took — so pace is
-- derivable without storing it.
--
-- Metres, not miles, because storing the display unit would let two rows
-- disagree about what "5" means. Conversion is a preference.

alter table public.exercises
  drop constraint suggested_type_known,
  add constraint suggested_type_known
    check (suggested_type in ('time','reps','distance'));

alter table public.exercise_targets
  drop constraint exercise_targets_target_type_check,
  add constraint target_type_known
    check (target_type in ('time','reps','distance'));

alter table public.session_items
  drop constraint session_items_target_type_check,
  add constraint target_type_known
    check (target_type is null or target_type in ('time','reps','distance'));

alter table public.preferences
  add column distance_unit text not null default 'mi'
    check (distance_unit in ('mi','km'));

comment on column public.exercises.suggested_value is
  'Seconds when suggested_type is time, a count when reps, METRES when
   distance. One number, one unit.';
comment on column public.exercise_targets.target_value is
  'Seconds / reps / metres, per target_type.';

insert into public.exercises
  (name, kind, suggested_type, suggested_value, suggested_sets, sort_order,
   instructions, description)
values
  ('Walk', 'cardio', 'distance', 1600, 1, 20,
   'Brisk enough to talk but not sing.',
   'Steady walking. The simplest cardio there is, and the easiest to keep doing.'),
  ('Run', 'cardio', 'distance', 3200, 1, 21,
   'Land under your hips, not out in front.',
   'Continuous running at a conversational pace unless you mean otherwise.'),
  ('Bike', 'cardio', 'distance', 8000, 1, 22,
   'Spin rather than grind — keep the cadence up.',
   'Cycling, indoor or out.');

insert into public.exercise_attributes (exercise_id, value_id)
select e.id, v.id
from public.exercises e
join (values
  ('Walk','body_area','full_body'), ('Walk','equipment','none'), ('Walk','difficulty','beginner'),
  ('Run','body_area','full_body'),  ('Run','equipment','none'),  ('Run','difficulty','intermediate'),
  ('Run','condition','knee_oa'),
  ('Bike','body_area','quads'),     ('Bike','body_area','glutes'),('Bike','difficulty','beginner'),
  ('Bike','condition','knee_oa')
) as m(ex_name, type_key, value_key) on m.ex_name = e.name
join public.attribute_types  t on t.key = m.type_key  and t.user_id is null
join public.attribute_values v on v.key = m.value_key and v.type_id = t.id
where e.user_id is null;
