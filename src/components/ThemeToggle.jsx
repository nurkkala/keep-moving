import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../lib/theme";

/* Order runs light → system → dark so the middle position reads as the
   middle setting rather than as a third option bolted on the end. */
const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "Follow system", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * A segmented control rather than a switch: "system" is a real choice, and a
 * two-position toggle can't say which of the three you picked. Showing all
 * three also means the current setting is legible without opening anything.
 */
export default function ThemeToggle({ className = "" }) {
  const [theme, choose] = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex rounded-sm border border-line overflow-hidden ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={`p-2 focus:outline-none focus:ring-1 focus:ring-accent ${
              active ? "bg-surface-hi text-ink" : "text-subtle hover:text-ink-dim"
            }`}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}
