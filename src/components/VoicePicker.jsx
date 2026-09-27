import React, { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { savePrefs } from "../lib/data";
import {
  createSpeaker, listVoices, prettyVoice, tierOf, whenVoicesReady,
} from "../lib/speech";

const SAMPLE = "Plank, 45 seconds. Squeeze at the top for a count.";
const TIERS = ["Best quality", "Good", "Basic"];

/**
 * The coach's voice and pace. Saved to preferences, which the session screen
 * reads when it builds its speaker.
 *
 * Voices are installed per device, so a voice chosen on a laptop may not
 * exist on the phone. An empty choice means automatic: the speaker takes the
 * best-ranked voice this device has.
 */
export default function VoicePicker({ initialVoiceURI, initialRate }) {
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState(initialVoiceURI ?? "");
  const [rate, setRate] = useState(initialRate ?? 1);
  const [error, setError] = useState(null);
  const savedRate = useRef(initialRate ?? 1);

  useEffect(() => {
    let canceled = false;
    whenVoicesReady().then(() => !canceled && setVoices(listVoices()));
    return () => {
      canceled = true;
    };
  }, []);

  // A slider fires on every step; save once it has come to rest.
  useEffect(() => {
    if (rate === savedRate.current) return;
    const timer = setTimeout(() => {
      savePrefs({ rate })
        .then(() => {
          savedRate.current = rate;
          setError(null);
        })
        .catch((e) => setError(e.message ?? "Couldn't save the speed."));
    }, 400);
    return () => clearTimeout(timer);
  }, [rate]);

  if (typeof speechSynthesis === "undefined") {
    return <p className="mt-2 text-xs text-faint">This browser can't speak, so there's no voice to choose.</p>;
  }

  const installed = voices.some((v) => v.voiceURI === voiceURI);
  const missing = voiceURI && voices.length > 0 && !installed;

  const choose = async (uri) => {
    setVoiceURI(uri);
    const v = voices.find((x) => x.voiceURI === uri);
    try {
      await savePrefs({ voiceURI: uri || null, voiceName: v?.name ?? null });
      setError(null);
    } catch (e) {
      setError(e.message ?? "Couldn't save the voice.");
    }
  };

  const hear = () => {
    createSpeaker({ voiceURI: installed ? voiceURI : null, rate }).speak(SAMPLE, true);
  };

  return (
    <div className="mt-2">
      <select
        value={installed ? voiceURI : ""}
        onChange={(e) => choose(e.target.value)}
        aria-label="Coach voice"
        className="w-full bg-canvas border border-line-hi rounded-sm px-3 py-3 text-sm text-ink
                   focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      >
        <option value="">
          Automatic{voices[0] ? ` (${prettyVoice(voices[0])})` : ""}
        </option>
        {TIERS.map((tier) => {
          const inTier = voices.filter((v) => tierOf(v) === tier);
          if (!inTier.length) return null;
          return (
            <optgroup key={tier} label={tier}>
              {inTier.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {prettyVoice(v)} · {v.lang}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {missing && (
        <p className="mt-2 text-[11px] text-subtle">
          The voice you chose elsewhere isn't on this device, so the best one here is used.
        </p>
      )}

      <label className="block mt-4">
        <span className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.2em] text-subtle">
          Speed
          <span className="text-muted normal-case tracking-normal" style={{ fontVariantNumeric: "tabular-nums" }}>
            {rate.toFixed(2)}×
          </span>
        </span>
        <input
          type="range"
          min={0.7}
          max={1.3}
          step={0.05}
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          className="mt-2 w-full accent-accent"
        />
      </label>

      <button
        onClick={hear}
        className="mt-4 w-full border-2 border-line-hi rounded-sm py-3 inline-flex items-center justify-center gap-2
                   text-sm text-ink-dim active:bg-surface-hi hover:border-line-hi3
                   focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <Volume2 size={16} /> Hear it
      </button>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
