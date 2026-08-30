/**
 * Stands in for lib/coachData when building the snapshot page. Only the async
 * functions are faked — the formatting helpers are re-exported from the real
 * module, so the snapshots can't drift from what the app actually renders.
 */
export {
  describeDays,
  describeTarget,
  describeOrderMode,
  describeRule,
} from "@real-coachdata";

const wait = (v, ms = 120) => new Promise((r) => setTimeout(() => r(v), ms));

const EX = {
  plank: "e1", squats: "e2", pushups: "e3", catcow: "e4", childs: "e5",
  bridges: "e6", birddog: "e7", neck: "e8",
};

export const WORKOUTS = [
  {
    id: "w1",
    name: "Daily mobility",
    description: "Stretch, strength, and core. Built from the starter library — edit freely.",
    days: [1, 2, 3, 4, 5],
    daysLabel: "Weekdays",
    orderMode: "straight",
    restSec: 15,
    position: 0,
    exerciseCount: 6,
    estWorkSec: 415,
  },
  {
    id: "w2",
    name: "Strength circuit",
    description: "Three rounds, rotating. Two arm exercises chosen fresh each time.",
    days: [2, 5],
    daysLabel: "Tue, Fri",
    orderMode: "circuit",
    restSec: 45,
    position: 1,
    exerciseCount: 5,
    estWorkSec: 620,
  },
  {
    id: "w3",
    name: "Bad back day",
    description: "Reach for this when the low back is unhappy.",
    days: [],
    daysLabel: "Not scheduled",
    orderMode: "straight",
    restSec: 20,
    position: 2,
    exerciseCount: 4,
    estWorkSec: 300,
  },
];

const SLOTS = [
  { id: "s1", isRule: false, exerciseId: EX.neck, name: "Neck rolls", kind: "stretch",
    targetType: "time", targetValue: 30, sets: 1, targetIsPersonal: false, note: "" },
  { id: "s2", isRule: false, exerciseId: EX.catcow, name: "Cat cow", kind: "stretch",
    targetType: "time", targetValue: 40, sets: 1, targetIsPersonal: false, note: "" },
  { id: "s3", isRule: false, exerciseId: EX.squats, name: "Bodyweight squats", kind: "strength",
    targetType: "reps", targetValue: 15, sets: 3, targetIsPersonal: true, note: "" },
  { id: "s4", isRule: true, pickCount: 2, tags: [{ id: "v1", label: "Arms" }], note: "" },
  { id: "s5", isRule: false, exerciseId: EX.plank, name: "Plank", kind: "core",
    targetType: "time", targetValue: 90, sets: 2, targetIsPersonal: true, note: "" },
  { id: "s6", isRule: false, exerciseId: EX.childs, name: "Child's pose", kind: "stretch",
    targetType: "time", targetValue: 45, sets: 1, targetIsPersonal: false, note: "" },
];

const RESOLVED = SLOTS.filter((s) => !s.isRule).map((s) => ({
  ...s,
  description: "",
  cue: {
    "Neck rolls": "Slow circles. Keep the shoulders down.",
    "Cat cow": "Move with your breath.",
    "Bodyweight squats": "Chest up, weight in the heels.",
    Plank: "Ribs down, hips level.",
    "Child's pose": "Let the breath go long.",
  }[s.name] ?? "",
  videoUrl: null,
}));

export const fetchWorkouts = () => wait(WORKOUTS);
export const fetchOrSeedWorkouts = () => wait(WORKOUTS);
export const fetchWorkoutsForDay = () => wait(WORKOUTS.slice(0, 2));
export const fetchWorkoutExercises = () => wait(RESOLVED);
export const fetchWorkoutSlots = () => wait(SLOTS);
export const createWorkout = () => wait("w4");
export const updateWorkout = () => wait();
export const deleteWorkout = () => wait();
export const saveWorkoutExercises = () => wait();
export const previewWorkout = () => wait([]);

/** A circuit mid-flight: squats set 2 of 3, so the rep stepper is showing. */
export const fetchWorkoutSequence = () =>
  wait([
    { ordinal: 0, setNumber: 1, totalSets: 3, exerciseId: EX.squats,
      name: "Bodyweight squats", kind: "strength", targetType: "reps", targetValue: 15,
      cue: "Chest up, weight in the heels.", isLastSet: false, fromRule: false },
    { ordinal: 1, setNumber: 2, totalSets: 3, exerciseId: EX.squats,
      name: "Bodyweight squats", kind: "strength", targetType: "reps", targetValue: 15,
      cue: "Chest up, weight in the heels.", isLastSet: false, fromRule: false },
    { ordinal: 2, setNumber: 1, totalSets: 2, exerciseId: EX.plank,
      name: "Plank", kind: "core", targetType: "time", targetValue: 90,
      cue: "Ribs down, hips level.", isLastSet: false, fromRule: false },
  ]);

const ATTRS = {
  body_area: [
    { id: "v1", key: "arms", label: "Arms" },
    { id: "v2", key: "core", label: "Core" },
    { id: "v3", key: "lower_back", label: "Lower back" },
    { id: "v4", key: "glutes", label: "Glutes" },
    { id: "v5", key: "hamstrings", label: "Hamstrings" },
    { id: "v6", key: "shoulders", label: "Shoulders" },
  ],
  condition: [
    { id: "v7", key: "low_back_pain", label: "Low back pain" },
    { id: "v8", key: "sciatica", label: "Sciatica" },
    { id: "v9", key: "knee_oa", label: "Knee osteoarthritis" },
    { id: "v10", key: "rotator_cuff", label: "Rotator cuff injury" },
  ],
  equipment: [
    { id: "v11", key: "none", label: "No equipment" },
    { id: "v12", key: "mat", label: "Mat" },
    { id: "v13", key: "band", label: "Resistance band" },
  ],
  difficulty: [
    { id: "v14", key: "beginner", label: "Beginner" },
    { id: "v15", key: "intermediate", label: "Intermediate" },
    { id: "v16", key: "advanced", label: "Advanced" },
  ],
};

export const fetchAttributeTypes = () =>
  wait([
    { id: "t1", key: "body_area", label: "Body area", multiValued: true, values: ATTRS.body_area },
    { id: "t2", key: "condition", label: "Condition", multiValued: true, values: ATTRS.condition },
    { id: "t3", key: "equipment", label: "Equipment", multiValued: true, values: ATTRS.equipment },
    { id: "t4", key: "difficulty", label: "Difficulty", multiValued: false, values: ATTRS.difficulty },
  ]);

const LIBRARY = [
  { id: EX.plank, name: "Plank", kind: "core", builtIn: true,
    description: "Anti-extension core hold. Stop when the low back starts to sag.",
    instructions: "Ribs down, hips level.", videoUrl: "https://youtube.com/watch?v=abc",
    suggestedType: "time", suggestedValue: 45, suggestedSets: 1,
    attributes: { body_area: [ATTRS.body_area[1]], condition: [ATTRS.condition[0]],
                  equipment: [ATTRS.equipment[1]], difficulty: [ATTRS.difficulty[1]] } },
  { id: EX.birddog, name: "Bird dog", kind: "core", builtIn: false,
    description: "Anti-rotation core work. Keep the hips square to the floor.",
    instructions: "Ten each side, hold five seconds at the top.", videoUrl: null,
    suggestedType: "reps", suggestedValue: 10, suggestedSets: 3,
    attributes: { body_area: [ATTRS.body_area[1], ATTRS.body_area[2]],
                  condition: [ATTRS.condition[0]], difficulty: [ATTRS.difficulty[0]] } },
  { id: EX.bridges, name: "Glute bridges", kind: "strength", builtIn: true,
    description: "Posterior chain strength with no load on the spine.",
    instructions: "Squeeze at the top for a count.", videoUrl: null,
    suggestedType: "reps", suggestedValue: 15, suggestedSets: 1,
    attributes: { body_area: [ATTRS.body_area[3]], condition: [ATTRS.condition[0]] } },
  { id: EX.catcow, name: "Cat cow", kind: "stretch", builtIn: true,
    description: "Segmental spine mobility on hands and knees.",
    instructions: "Move with your breath.", videoUrl: null,
    suggestedType: "time", suggestedValue: 40, suggestedSets: 1,
    attributes: { body_area: [ATTRS.body_area[2]], condition: [ATTRS.condition[0]] } },
];

export const fetchExercises = ({ search = "" } = {}) =>
  wait(LIBRARY.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())));
export const fetchExercise = () => wait(LIBRARY[1]);
export const createExercise = () => wait(LIBRARY[1]);
export const updateExercise = () => wait();
export const deleteExercise = () => wait();
export const setExerciseTags = () => wait();
export const createAttributeValue = () => wait({});

export const fetchTargets = () => wait({});
export const setExerciseTarget = () => wait();
export const clearExerciseTarget = () => wait();

const ago = (d) => Date.now() - d * 86400000;

export const fetchHistory = () =>
  wait([
    { id: "h1", at: ago(1), totalSec: 620, workoutId: "w2", workoutName: "Strength circuit",
      orderMode: "circuit", items: [
        { exerciseId: EX.squats, name: "Bodyweight squats", kind: "strength", targetType: "reps",
          targetValue: 15, targetSets: 3, setsDone: 3, totalValue: 38, bestSet: 15,
          totalSec: 132, metEverySet: false },
        { exerciseId: EX.pushups, name: "Push ups", kind: "strength", targetType: "reps",
          targetValue: 10, targetSets: 3, setsDone: 3, totalValue: 27, bestSet: 10,
          totalSec: 120, metEverySet: false },
        { exerciseId: EX.plank, name: "Plank", kind: "core", targetType: "time",
          targetValue: 90, targetSets: 2, setsDone: 2, totalValue: 152, bestSet: 90,
          totalSec: 152, metEverySet: false },
      ] },
    { id: "h2", at: ago(3), totalSec: 415, workoutId: "w1", workoutName: "Daily mobility",
      orderMode: "straight", items: [
        { exerciseId: EX.neck, name: "Neck rolls", kind: "stretch", targetType: "time",
          targetValue: 30, targetSets: 1, setsDone: 1, totalValue: 30, bestSet: 30,
          totalSec: 30, metEverySet: true },
        { exerciseId: EX.catcow, name: "Cat cow", kind: "stretch", targetType: "time",
          targetValue: 40, targetSets: 1, setsDone: 1, totalValue: 40, bestSet: 40,
          totalSec: 40, metEverySet: true },
        { exerciseId: EX.plank, name: "Plank", kind: "core", targetType: "time",
          targetValue: 90, targetSets: 2, setsDone: 2, totalValue: 175, bestSet: 90,
          totalSec: 175, metEverySet: false },
      ] },
    { id: "h3", at: ago(6), totalSec: 380, workoutId: "w1", workoutName: "Daily mobility",
      orderMode: "straight", items: [
        { exerciseId: EX.plank, name: "Plank", kind: "core", targetType: "time",
          targetValue: 60, targetSets: 2, setsDone: 2, totalValue: 120, bestSet: 60,
          totalSec: 120, metEverySet: true },
      ] },
  ]);

/** Deliberately shows the fade across sets, and a target raised part-way. */
export const fetchPerformanceHistory = () =>
  wait([
    { sessionId: "h1", at: ago(1), workoutName: "Strength circuit", orderMode: "circuit",
      setNumber: 1, targetType: "reps", targetValue: 15, targetSets: 3, actualValue: 15,
      actualSec: 48, skipped: false, how: "voice", metTarget: true },
    { sessionId: "h1", at: ago(1), workoutName: "Strength circuit", orderMode: "circuit",
      setNumber: 2, targetType: "reps", targetValue: 15, targetSets: 3, actualValue: 13,
      actualSec: 46, skipped: false, how: "voice", metTarget: false },
    { sessionId: "h1", at: ago(1), workoutName: "Strength circuit", orderMode: "circuit",
      setNumber: 3, targetType: "reps", targetValue: 15, targetSets: 3, actualValue: 10,
      actualSec: 42, skipped: false, how: "tap", metTarget: false },
    { sessionId: "h4", at: ago(8), workoutName: "Strength circuit", orderMode: "circuit",
      setNumber: 1, targetType: "reps", targetValue: 12, targetSets: 3, actualValue: 12,
      actualSec: 44, skipped: false, how: "voice", metTarget: true },
    { sessionId: "h4", at: ago(8), workoutName: "Strength circuit", orderMode: "circuit",
      setNumber: 2, targetType: "reps", targetValue: 12, targetSets: 3, actualValue: 12,
      actualSec: 45, skipped: false, how: "voice", metTarget: true },
    { sessionId: "h4", at: ago(8), workoutName: "Strength circuit", orderMode: "circuit",
      setNumber: 3, targetType: "reps", targetValue: 12, targetSets: 3, actualValue: 0,
      actualSec: 0, skipped: true, how: "skipped", metTarget: null },
  ]);

export const fetchBests = () =>
  wait({
    [EX.squats]: { name: "Bodyweight squats", targetType: "reps", bestSet: 15,
                   setsPerformed: 18, timesPerformed: 6, lastPerformed: ago(1) },
  });

export const fetchKindTotals = () => wait({ stretch: 1420, strength: 980, core: 760 });
export const saveSession = () => wait("new");
export const deleteSession = () => wait();
export const clearHistory = () => wait();
export const fetchPrefs = () => wait({ voiceURI: null, voiceName: null, rate: 1, restSec: 15 });
export const savePrefs = () => wait();
