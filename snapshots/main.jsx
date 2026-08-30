import React from "react";
import { createRoot } from "react-dom/client";
import "./snapshot.css";

import WorkoutPicker from "../src/components/WorkoutPicker";
import WorkoutEditor from "../src/components/WorkoutEditor";
import CoachSession from "../src/components/CoachSession";
import ExerciseDetail from "../src/components/ExerciseDetail";
import ExerciseEditor from "../src/components/ExerciseEditor";
import TargetSheet from "../src/components/TargetSheet";
import History from "../src/components/History";
import EquipmentInventory from "../src/components/EquipmentInventory";
import { WORKOUTS } from "./mockData";

const noop = () => {};

const SCREENS = [
  {
    title: "Today",
    note: "The front door. What's scheduled, then everything else. Estimated minutes come from the resolved targets.",
    el: <WorkoutPicker onStart={noop} onEdit={noop} onHistory={noop} onSignOut={noop} />,
  },
  {
    title: "Session — reps",
    note: "Large targets throughout. The stepper logs what you actually did, by thumb or by saying \"two more\". Primary action is alone on its row.",
    el: <CoachSession workout={WORKOUTS[1]} onExit={noop} onFinished={noop} />,
  },
  {
    title: "Workout editor",
    note: "Schedule, order mode, rest, and the slot list. The fourth slot is a rule, not an exercise.",
    el: <WorkoutEditor workout={WORKOUTS[0]} onBack={noop} onChanged={noop} />,
  },
  {
    title: "Exercise detail — blocked",
    note: "Needs a band you don't own. It warns rather than hiding, and offers same-area exercises you can actually do.",
    el: (
      <div className="min-h-screen bg-slate-950">
        <ExerciseDetail exerciseId="e7" onClose={noop} onEdit={noop} />
      </div>
    ),
  },
  {
    title: "Set your target",
    note: "One target per exercise, shared across every workout using it. Changing it never touches history.",
    el: (
      <div className="min-h-screen bg-slate-950">
        <TargetSheet
          exercise={{
            exerciseId: "e1", name: "Plank", targetType: "time",
            targetValue: 90, sets: 2, targetIsPersonal: true,
          }}
          onClose={noop}
          onSaved={noop}
        />
      </div>
    ),
  },
  {
    title: "New exercise",
    note: "Hold times go in the instructions, which the coach speaks. The numbers are a suggestion for newcomers, not your target.",
    el: <ExerciseEditor onClose={noop} onSaved={noop} />,
  },
  {
    title: "Equipment",
    note: "What you own. Each unchecked item shows how many exercises it's blocking, so the checklist has a visible consequence.",
    el: <EquipmentInventory onBack={noop} />,
  },
  {
    title: "History",
    note: "Rolled up per exercise. \"under\" marks a session where a set missed the target as it stood that day.",
    el: <History onBack={noop} />,
  },
];

function Frame({ title, note, el }) {
  return (
    <section className="shrink-0">
      <h2 className="text-slate-100 text-sm font-medium">{title}</h2>
      <p className="text-slate-500 text-xs mt-1 mb-3 max-w-[380px] leading-relaxed">{note}</p>
      <div className="snap-frame w-[390px] h-[780px] overflow-y-auto rounded-lg border border-slate-700 bg-slate-950">
        {el}
      </div>
    </section>
  );
}

function Snapshots() {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Coach</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-100">Screens</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
          The real components, rendered against mock data. Everything is live — scroll each frame,
          tap the controls, open the sheets. The session screen runs its actual timer, so it will
          count down and advance on its own.
        </p>
      </header>

      <div className="flex gap-8 overflow-x-auto pb-8">
        {SCREENS.map((s) => (
          <Frame key={s.title} {...s} />
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Snapshots />);
