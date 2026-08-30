-- ================================================== built-in attribute axes
insert into public.attribute_types (key, label, multi_valued, position) values
  ('body_area',  'Body area',  true,  1),
  ('condition',  'Condition',  true,  2),
  ('equipment',  'Equipment',  true,  3),
  ('difficulty', 'Difficulty', false, 4);

insert into public.attribute_values (type_id, key, label, position)
select t.id, v.key, v.label, v.position
from public.attribute_types t
join (values
  ('body_area','neck','Neck',1),
  ('body_area','shoulders','Shoulders',2),
  ('body_area','chest','Chest',3),
  ('body_area','upper_back','Upper back',4),
  ('body_area','lower_back','Lower back',5),
  ('body_area','core','Core',6),
  ('body_area','glutes','Glutes',7),
  ('body_area','hips','Hips',8),
  ('body_area','quads','Quads',9),
  ('body_area','hamstrings','Hamstrings',10),
  ('body_area','calves','Calves',11),
  ('body_area','ankles','Ankles & feet',12),
  ('body_area','wrists','Wrists & forearms',13),
  ('body_area','full_body','Full body',14),

  ('condition','low_back_pain','Low back pain',1),
  ('condition','neck_strain','Neck strain',2),
  ('condition','rotator_cuff','Rotator cuff injury',3),
  ('condition','frozen_shoulder','Frozen shoulder',4),
  ('condition','knee_oa','Knee osteoarthritis',5),
  ('condition','acl_rehab','ACL rehab',6),
  ('condition','patellofemoral','Patellofemoral pain',7),
  ('condition','plantar_fasciitis','Plantar fasciitis',8),
  ('condition','achilles','Achilles tendinopathy',9),
  ('condition','sciatica','Sciatica',10),
  ('condition','tennis_elbow','Tennis elbow',11),
  ('condition','carpal_tunnel','Carpal tunnel',12),
  ('condition','hip_replacement','Hip replacement recovery',13),

  ('equipment','none','No equipment',1),
  ('equipment','mat','Mat',2),
  ('equipment','chair','Chair',3),
  ('equipment','wall','Wall',4),
  ('equipment','band','Resistance band',5),
  ('equipment','dumbbells','Dumbbells',6),
  ('equipment','foam_roller','Foam roller',7),

  ('difficulty','beginner','Beginner',1),
  ('difficulty','intermediate','Intermediate',2),
  ('difficulty','advanced','Advanced',3)
) as v(type_key, key, label, position) on v.type_key = t.key
where t.user_id is null;

-- ============================================ built-in exercises (the default routine)
insert into public.exercises (name, kind, default_type, default_seconds, default_reps, instructions, description) values
  ('Neck rolls','stretch','time',30,null,'Slow circles. Keep the shoulders down.','Gentle mobility for a stiff neck. Never force the range — this should feel like release, not effort.'),
  ('Shoulder rolls','stretch','time',30,null,'Big backward circles.','Wakes up the upper back and counters a rounded desk posture.'),
  ('Cat cow','stretch','time',40,null,'Move with your breath.','Segmental spine mobility on hands and knees. Inhale to arch, exhale to round.'),
  ('Left quad stretch','stretch','time',30,null,'Knees together, hips forward.','Standing quad stretch. Hold a wall or chair if balance is a problem.'),
  ('Right quad stretch','stretch','time',30,null,'Knees together, hips forward.','Standing quad stretch. Hold a wall or chair if balance is a problem.'),
  ('Bodyweight squats','strength','reps',null,12,'Chest up, weight in the heels.','Foundational lower-body strength. Knees track over the toes, never collapsing inward.'),
  ('Push ups','strength','reps',null,10,'Elbows at forty five degrees.','Upper-body pressing. Drop to the knees to keep the form honest.'),
  ('Glute bridges','strength','reps',null,15,'Squeeze at the top for a count.','Posterior chain strength with no load on the spine.'),
  ('Plank','core','time',45,null,'Ribs down, hips level.','Anti-extension core hold. Stop when the low back starts to sag.'),
  ('Child''s pose','stretch','time',45,null,'Let the breath go long.','Restorative close. Opens the hips and lower back.');

-- ============================================================ tag the built-ins
insert into public.exercise_attributes (exercise_id, value_id)
select e.id, v.id
from public.exercises e
join (values
  ('Neck rolls','body_area','neck'),
  ('Neck rolls','body_area','shoulders'),
  ('Neck rolls','condition','neck_strain'),
  ('Neck rolls','difficulty','beginner'),
  ('Shoulder rolls','body_area','shoulders'),
  ('Shoulder rolls','body_area','upper_back'),
  ('Shoulder rolls','condition','frozen_shoulder'),
  ('Shoulder rolls','difficulty','beginner'),
  ('Cat cow','body_area','lower_back'),
  ('Cat cow','body_area','upper_back'),
  ('Cat cow','body_area','core'),
  ('Cat cow','condition','low_back_pain'),
  ('Cat cow','equipment','mat'),
  ('Cat cow','difficulty','beginner'),
  ('Left quad stretch','body_area','quads'),
  ('Left quad stretch','body_area','hips'),
  ('Left quad stretch','condition','patellofemoral'),
  ('Left quad stretch','difficulty','beginner'),
  ('Right quad stretch','body_area','quads'),
  ('Right quad stretch','body_area','hips'),
  ('Right quad stretch','condition','patellofemoral'),
  ('Right quad stretch','difficulty','beginner'),
  ('Bodyweight squats','body_area','quads'),
  ('Bodyweight squats','body_area','glutes'),
  ('Bodyweight squats','condition','knee_oa'),
  ('Bodyweight squats','equipment','none'),
  ('Bodyweight squats','difficulty','beginner'),
  ('Push ups','body_area','chest'),
  ('Push ups','body_area','shoulders'),
  ('Push ups','body_area','core'),
  ('Push ups','equipment','none'),
  ('Push ups','difficulty','intermediate'),
  ('Glute bridges','body_area','glutes'),
  ('Glute bridges','body_area','hamstrings'),
  ('Glute bridges','body_area','lower_back'),
  ('Glute bridges','condition','low_back_pain'),
  ('Glute bridges','equipment','mat'),
  ('Glute bridges','difficulty','beginner'),
  ('Plank','body_area','core'),
  ('Plank','body_area','shoulders'),
  ('Plank','condition','low_back_pain'),
  ('Plank','equipment','mat'),
  ('Plank','difficulty','intermediate'),
  ('Child''s pose','body_area','lower_back'),
  ('Child''s pose','body_area','hips'),
  ('Child''s pose','condition','low_back_pain'),
  ('Child''s pose','equipment','mat'),
  ('Child''s pose','difficulty','beginner')
) as m(ex_name, type_key, value_key) on m.ex_name = e.name
join public.attribute_types  t on t.key = m.type_key  and t.user_id is null
join public.attribute_values v on v.key = m.value_key and v.type_id = t.id
where e.user_id is null;
