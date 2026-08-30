-- Turns a workout's slots into a concrete exercise list. Fixed slots pass
-- through; rule slots choose their exercises now.
--
-- Choice is least-recently-performed first, with a random tiebreak among
-- never-done exercises. That makes "two arm exercises" rotate through the
-- library instead of returning the same favourite every week, and it favours
-- what you've been neglecting.
--
-- Volatile, not stable: two calls give different answers by design.
create function public.resolve_workout(target_workout uuid)
returns table (
  ordinal int, slot_id uuid, exercise_id uuid, from_rule boolean, note text
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  slot   record;
  chosen uuid;
  used   uuid[] := '{}';
  n      int := 0;
begin
  for slot in
    select we.id, we.exercise_id, we.pick_count, we.note
    from public.workout_exercises we
    where we.workout_id = target_workout and we.user_id = auth.uid()
    order by we.position
  loop
    if slot.exercise_id is not null then
      used := used || slot.exercise_id;
      ordinal := n; slot_id := slot.id; exercise_id := slot.exercise_id;
      from_rule := false; note := slot.note;
      n := n + 1;
      return next;
    else
      for chosen in
        select e.id
        from public.exercises e
        where (e.user_id is null or e.user_id = auth.uid())
          and not (e.id = any(used))
          -- Every tag on the slot must be present on the exercise.
          and not exists (
            select 1
            from public.workout_slot_tags st
            where st.slot_id = slot.id
              and not exists (
                select 1 from public.exercise_attributes ea
                where ea.exercise_id = e.id and ea.value_id = st.value_id
              )
          )
        order by (
          select max(s.performed_at)
          from public.session_items si
          join public.sessions s on s.id = si.session_id
          where si.exercise_id = e.id and si.user_id = auth.uid()
        ) asc nulls first, random()
        limit slot.pick_count
      loop
        used := used || chosen;
        ordinal := n; slot_id := slot.id; exercise_id := chosen;
        from_rule := true; note := slot.note;
        n := n + 1;
        return next;
      end loop;
    end if;
  end loop;
end;
$$;

drop function if exists public.workout_sequence(uuid);

-- The walked sequence, now built on resolved slots so rule slots expand into
-- real exercises before sets are counted.
create function public.workout_sequence(target_workout uuid)
returns table (
  ordinal int, set_number int, total_sets int,
  exercise_id uuid, name text, kind text,
  target_type text, target_value int,
  instructions text, note text, from_rule boolean
)
language sql
volatile
security invoker
set search_path = ''
as $$
  with resolved as (
    select r.ordinal as slot_order, r.exercise_id, r.from_rule, r.note,
           e.name, e.kind, e.instructions,
           coalesce(t.target_type,  e.suggested_type)  as target_type,
           coalesce(t.target_value, e.suggested_value) as target_value,
           coalesce(t.sets,         e.suggested_sets)  as sets
    from public.resolve_workout(target_workout) r
    join public.exercises e on e.id = r.exercise_id
    left join public.exercise_targets t
           on t.exercise_id = r.exercise_id and t.user_id = auth.uid()
  ),
  expanded as (
    select rs.*, g.n as set_number
    from resolved rs
    cross join lateral generate_series(1, rs.sets) as g(n)
  ),
  ordered as (
    select e.*,
           case (select w.order_mode from public.workouts w where w.id = target_workout)
             when 'straight' then row_number() over (order by e.slot_order, e.set_number)
             else row_number() over (order by e.set_number, e.slot_order)
           end as seq
    from expanded e
  )
  select (seq - 1)::int, set_number, sets, exercise_id, name, kind,
         target_type, target_value, instructions, note, from_rule
  from ordered
  order by seq;
$$;
