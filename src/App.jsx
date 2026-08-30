import React from "react";
import AuthGate from "./components/AuthGate";
import WorkoutPicker from "./components/WorkoutPicker";

/**
 * The timer itself (exercise-coach.jsx) hasn't been ported yet — see TODO in
 * CLAUDE.md. WorkoutPicker passes the resolved exercise list to onStart, which
 * is the shape the coach loop already speaks.
 */
export default function App() {
  return (
    <AuthGate>
      {({ signOut }) => (
        <WorkoutPicker
          onSignOut={signOut}
          onStart={(workout, exercises) => {
            console.log("Start", workout.name, exercises);
          }}
        />
      )}
    </AuthGate>
  );
}
