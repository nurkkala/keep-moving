-- An exercise with its tags, and a workout with its slots, each saved in one
-- transaction. The editors used to make two or three separate requests, so a
-- failure part-way left an exercise with no tags, a duplicate on retry, or a
-- workout renamed without its slots. Roadmap TODO-10-atomic-saves.

-- Creates (target_exercise null) or updates a user-owned exercise, then
-- replaces its whole tag set. Returns the exercise's id.
create or replace function public.save_exercise(
  target_exercise uuid, fields jsonb, tag_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved uuid;
begin
  if target_exercise is null then
    insert into public.exercises
      (user_id, name, kind, description, instructions, video_url,
       suggested_type, suggested_value, suggested_sets)
    values (
      auth.uid(),
      fields->>'name',
      fields->>'kind',
      nullif(fields->>'description', ''),
      nullif(fields->>'instructions', ''),
      nullif(fields->>'video_url', ''),
      fields->>'suggested_type',
      (fields->>'suggested_value')::int,
      coalesce((fields->>'suggested_sets')::int, 1)
    )
    returning id into saved;
  else
    -- RLS already limits this to the caller's own exercises; the owner test
    -- makes a built-in or missing one an error instead of a silent no-op.
    update public.exercises set
      name            = fields->>'name',
      kind            = fields->>'kind',
      description     = nullif(fields->>'description', ''),
      instructions    = nullif(fields->>'instructions', ''),
      video_url       = nullif(fields->>'video_url', ''),
      suggested_type  = fields->>'suggested_type',
      suggested_value = (fields->>'suggested_value')::int,
      suggested_sets  = coalesce((fields->>'suggested_sets')::int, 1)
    where id = target_exercise and user_id = auth.uid()
    returning id into saved;

    if saved is null then
      raise exception 'Exercise not found.';
    end if;
  end if;

  delete from public.exercise_attributes where exercise_id = saved;
  insert into public.exercise_attributes (exercise_id, value_id)
  select saved, v from unnest(coalesce(tag_ids, '{}'::uuid[])) as v
  on conflict do nothing;

  return saved;
end;
$$;

-- Updates a workout's own fields and replaces its slots together.
create or replace function public.save_workout(
  target_workout uuid, fields jsonb, items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.workouts set
    name         = fields->>'name',
    days_of_week = (
      select coalesce(array_agg(d::smallint order by d::smallint), '{}'::smallint[])
      from jsonb_array_elements_text(coalesce(fields->'days', '[]'::jsonb)) as d
    ),
    order_mode   = fields->>'order_mode',
    rest_sec     = (fields->>'rest_sec')::int
  where id = target_workout and user_id = auth.uid();

  if not found then
    raise exception 'Workout not found.';
  end if;

  perform public.save_workout_exercises(target_workout, items);
end;
$$;
