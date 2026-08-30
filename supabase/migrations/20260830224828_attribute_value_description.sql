-- A line of prose on a tag value.
--
-- Wanted first for equipment: "resistance band" doesn't say which one, and
-- "the light one, looped, in the hall cupboard" is the difference between
-- knowing you own it and guessing. It's on attribute_values rather than a new
-- equipment table because equipment is not a separate concept — it's the
-- equipment axis, and every other axis can use a description just as well.
--
-- Nullable with no default: most values won't need one, and an empty string
-- would be a value the UI has to special-case.

alter table public.attribute_values
  add column description text;

comment on column public.attribute_values.description is
  'Optional prose for one tag value — which band, which grade, what counts.';
