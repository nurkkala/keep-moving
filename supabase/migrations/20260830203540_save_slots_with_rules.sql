-- Saves a workout's slots, each either a fixed exercise or a rule with tags.
create or replace function public.save_workout_exercises(target_workout uuid, items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item     jsonb;
  ord      int := 0;
  new_slot uuid;
begin
  if not exists (
    select 1 from public.workouts w where w.id = target_workout and w.user_id = auth.uid()
  ) then
    raise exception 'Workout not found.';
  end if;

  -- Slot tags cascade from workout_exercises, so this clears them too.
  delete from public.workout_exercises where workout_id = target_workout;

  for item in select * from jsonb_array_elements(items)
  loop
    insert into public.workout_exercises
      (workout_id, user_id, exercise_id, position, pick_count, note)
    values (
      target_workout,
      auth.uid(),
      nullif(item->>'exercise_id', '')::uuid,
      ord,
      nullif(item->>'pick_count', '')::int,
      nullif(item->>'note', '')
    )
    returning id into new_slot;

    if item ? 'tag_ids' then
      insert into public.workout_slot_tags (slot_id, value_id)
      select new_slot, value::text::uuid
      from jsonb_array_elements_text(item->'tag_ids') as t(value)
      on conflict do nothing;
    end if;

    ord := ord + 1;
  end loop;
end;
$$;

-- Everything a workout editor needs: fixed slots and rule slots in one list.
create view public.workout_slots with (security_invoker = on) as
select we.id, we.workout_id, we.user_id, we.position, we.note,
       we.exercise_id, we.pick_count,
       we.exercise_id is null as is_rule,
       e.name, e.kind,
       coalesce(t.target_type,  e.suggested_type)  as target_type,
       coalesce(t.target_value, e.suggested_value) as target_value,
       coalesce(t.sets,         e.suggested_sets)  as sets,
       t.exercise_id is not null as target_is_personal,
       (select coalesce(json_agg(json_build_object('id', v.id, 'label', v.label)
                                 order by v.label), '[]'::json)
        from public.workout_slot_tags st
        join public.attribute_values v on v.id = st.value_id
        where st.slot_id = we.id) as tags
from public.workout_exercises we
left join public.exercises e on e.id = we.exercise_id
left join public.exercise_targets t
       on t.exercise_id = we.exercise_id and t.user_id = we.user_id;
