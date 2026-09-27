-- Performance advisor findings of 2026-09-27. Roadmap TODO-26-rls-perf.
-- None of these changes who can see or write what: every policy below grants
-- exactly what it granted before.

-- 1. auth.uid() wrapped in a scalar subquery is evaluated once per statement
--    instead of once per row.

alter policy "own preferences" on public.preferences
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own sessions" on public.sessions
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own session items" on public.session_items
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own targets" on public.exercise_targets
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own workouts" on public.workouts
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own workout exercises" on public.workout_exercises
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own equipment" on public.user_equipment
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own slot tags" on public.workout_slot_tags
  using (exists (select 1 from public.workout_exercises we
                 where we.id = workout_slot_tags.slot_id and we.user_id = (select auth.uid())))
  with check (exists (select 1 from public.workout_exercises we
                      where we.id = workout_slot_tags.slot_id and we.user_id = (select auth.uid())));

alter policy "read built-in and own types" on public.attribute_types
  using (user_id is null or (select auth.uid()) = user_id);
alter policy "read built-in and own values" on public.attribute_values
  using (user_id is null or (select auth.uid()) = user_id);
alter policy "read built-in and own exercises" on public.exercises
  using (user_id is null or (select auth.uid()) = user_id);
alter policy "read attributes of visible exercises" on public.exercise_attributes
  using (exists (select 1 from public.exercises e
                 where e.id = exercise_attributes.exercise_id
                   and (e.user_id is null or e.user_id = (select auth.uid()))));

-- 2. The "write own" policies were FOR ALL, so they also applied to SELECT,
--    where the read policy already covers every row they allow. Split each
--    into insert, update and delete so a read runs one policy.

drop policy "write own types" on public.attribute_types;
create policy "insert own types" on public.attribute_types for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own types" on public.attribute_types for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own types" on public.attribute_types for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy "write own values" on public.attribute_values;
create policy "insert own values" on public.attribute_values for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own values" on public.attribute_values for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own values" on public.attribute_values for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy "write own exercises" on public.exercises;
create policy "insert own exercises" on public.exercises for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own exercises" on public.exercises for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own exercises" on public.exercises for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy "tag own exercises" on public.exercise_attributes;
create policy "tag own exercises" on public.exercise_attributes for insert to authenticated
  with check (exists (select 1 from public.exercises e
                      where e.id = exercise_attributes.exercise_id and e.user_id = (select auth.uid())));
create policy "retag own exercises" on public.exercise_attributes for update to authenticated
  using (exists (select 1 from public.exercises e
                 where e.id = exercise_attributes.exercise_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.exercises e
                      where e.id = exercise_attributes.exercise_id and e.user_id = (select auth.uid())));
create policy "untag own exercises" on public.exercise_attributes for delete to authenticated
  using (exists (select 1 from public.exercises e
                 where e.id = exercise_attributes.exercise_id and e.user_id = (select auth.uid())));

-- 3. Foreign keys with no index leading on them. Each makes a delete of the
--    referenced row scan the referencing table.

create index attribute_values_user_idx       on public.attribute_values (user_id);
create index exercise_targets_exercise_idx   on public.exercise_targets (exercise_id);
create index session_items_exercise_id_idx   on public.session_items (exercise_id);
create index sessions_workout_idx            on public.sessions (workout_id);
create index user_equipment_value_idx        on public.user_equipment (value_id);
create index workout_exercises_exercise_idx  on public.workout_exercises (exercise_id);
create index workout_exercises_user_idx      on public.workout_exercises (user_id);
create index workout_slot_tags_value_idx     on public.workout_slot_tags (value_id);
