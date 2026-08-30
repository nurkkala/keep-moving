/**
 * Voice output and hands-free input for the coach.
 *
 * Two things worth knowing before changing anything here:
 *  - The browser default voice is almost always the worst one installed, so
 *    voices are ranked and the best is chosen unless the user picks another.
 *  - Recognition must be deaf while the coach is speaking, or it hears the
 *    word "done" in its own cue and skips the exercise.
 */

/* Novelty and robot system voices nobody wants coaching them. Matched as an
   exact-name blocklist rather than a score penalty, because a penalty still
   lets them surface when little else is installed. */
const NOVELTY = new Set([
  "albert", "bad news", "good news", "bahh", "bells", "boing", "bubbles",
  "cellos", "deranged", "jester", "organ", "superstar", "trinoids", "whisper",
  "wobble", "zarvox", "junior", "ralph", "fred", "kathy", "princess",
  "hysterical", "grandma", "grandpa", "rocko", "shelley", "sandy", "eddy",
  "flo", "reed", "rishi", "novelty",
]);

function isNovelty(v) {
  const name = (v.name || "").toLowerCase();
  const uri = (v.voiceURI || "").toLowerCase();
  for (const bad of NOVELTY) {
    if (name === bad || uri === bad || name.startsWith(bad + " ")) return true;
  }
  return false;
}

/** Higher is better. Cloud and neural voices sound human; compact ones don't. */
export function scoreVoice(v) {
  const n = (v.name || "").toLowerCase();
  let s = 0;
  if (/natural|neural|premium|enhanced/.test(n)) s += 50;
  if (!v.localService) s += 30;
  if (/google/.test(n)) s += 25;
  if (/siri/.test(n)) s += 22;
  if (/microsoft/.test(n)) s += 8;
  if (/^en-us|^en-gb/i.test(v.lang || "")) s += 6;
  if (/compact/.test(n)) s -= 40;
  return s;
}

export function tierOf(v) {
  const s = scoreVoice(v);
  if (s >= 45) return "Best quality";
  if (s >= 10) return "Good";
  return "Basic";
}

export function prettyVoice(v) {
  return (v.name || "Voice")
    .replace(/^(Microsoft|Google)\s+/i, "")
    .replace(/\s*[-–]\s*English.*$/i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
}

/** English voices, best first, novelty excluded unless asked for. */
export function listVoices({ includeNovelty = false } = {}) {
  if (typeof speechSynthesis === "undefined") return [];

  return speechSynthesis
    .getVoices()
    .filter((v) => /^en/i.test(v.lang || ""))
    .filter((v) => includeNovelty || !isNovelty(v))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a) || a.name.localeCompare(b.name));
}

/**
 * Voices load asynchronously in most browsers and synchronously in a few, so
 * resolve either way rather than assuming.
 */
export function whenVoicesReady() {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve([]);

    const ready = listVoices();
    if (ready.length) return resolve(ready);

    const onChange = () => {
      speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(listVoices());
    };
    speechSynthesis.addEventListener("voiceschanged", onChange);
    // Some browsers never fire the event. Don't hang the UI on it.
    setTimeout(() => resolve(listVoices()), 1500);
  });
}

/**
 * A speaker bound to the user's saved voice and pace.
 *
 * `onSpeakingChange` fires around every utterance so the caller can mute
 * recognition — without it the coach reliably hears itself.
 */
export function createSpeaker({ voiceURI, rate = 1, onSpeakingChange } = {}) {
  let current = null;
  let queued = 0;

  const pickVoice = () => {
    const voices = listVoices({ includeNovelty: true });
    return voices.find((v) => v.voiceURI === voiceURI) ?? listVoices()[0] ?? null;
  };

  const speak = (text, interrupt = false) => {
    if (typeof speechSynthesis === "undefined" || !text) return;

    if (interrupt) {
      speechSynthesis.cancel();
      queued = 0;
    }

    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;

    queued += 1;
    onSpeakingChange?.(true);

    const done = () => {
      queued = Math.max(0, queued - 1);
      if (queued === 0) onSpeakingChange?.(false);
    };
    u.onend = done;
    u.onerror = done;

    current = u;
    speechSynthesis.speak(u);
  };

  return {
    speak,
    stop() {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      queued = 0;
      current = null;
      onSpeakingChange?.(false);
    },
  };
}

export const RECOGNITION_SUPPORTED =
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90,
  // Specific before generic: "a couple more" must not match the article "a".
  couple: 2, an: 1, a: 1,
};

/** First number in the phrase, digits or words. Null if there isn't one. */
function numberIn(text) {
  const digits = text.match(/\b(\d{1,3})\b/);
  if (digits) return parseInt(digits[1], 10);

  for (const [word, n] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return n;
  }
  return null;
}

/**
 * Maps loose speech to a command. Returns null for anything unrecognised,
 * which the caller ignores — a false positive mid-workout is worse than a
 * miss, since it silently logs the wrong number.
 *
 * Order matters. "two more reps" must read as an adjustment, not as the
 * absolute count two, so relative phrasing is tested before bare numbers.
 */
export function parseCommand(transcript) {
  const t = transcript.toLowerCase().trim();

  /* --------------------------------------------------------------- control */
  if (/\b(pause|hold on|wait|stop|hold up|give me a (second|minute)|break)\b/.test(t)) {
    return { type: "pause" };
  }
  if (/\b(resume|continue|carry on|keep going|go again|ready|back)\b/.test(t)) {
    return { type: "resume" };
  }
  if (/\b(repeat|again|say (that|it) again|what was that|what)\b/.test(t)) {
    return { type: "repeat" };
  }
  if (/\bskip\b|\bpass\b|\bnot (today|this one)\b/.test(t)) {
    return { type: "skip" };
  }

  /* ------------------------------------------------- a longer hold, by voice */
  // "hold for another twenty" / "give me ten more seconds"
  if (/\b(hold|keep|stay|another|more time|extend)\b/.test(t) && /\bsecond|\bmore\b/.test(t)) {
    const n = numberIn(t);
    if (n) return { type: "extend", seconds: n };
  }

  /* ------------------------------------------------------------ adjustments */
  const more = /\b(more|extra|another|added|additional|over|past|beyond)\b/.test(t);
  const fewer = /\b(fewer|less|short|only did|couldn'?t|stopped at|down|under)\b/.test(t);

  if (more || fewer) {
    const n = numberIn(t);
    if (n) return { type: "adjust", delta: fewer ? -n : n };
    // "a few more" with no number still says which direction.
    return { type: "adjust", delta: fewer ? -1 : 1 };
  }

  /* ------------------------------------------------------------- completion */
  // Checked before bare numbers so "done, twelve" logs twelve and finishes.
  if (/\b(done|finished|complete|completed|next|got it|that'?s it|end set)\b/.test(t)) {
    const n = numberIn(t);
    return n ? { type: "done", value: n } : { type: "done" };
  }

  /* ------------------------------------------------------- an absolute count */
  const n = numberIn(t);
  if (n !== null) return { type: "count", value: n };

  return null;
}

/**
 * Continuous recognition that restarts itself, since browsers stop it after a
 * pause. `isMuted` is read live so the caller can gate it while speaking.
 */
export function createListener({ onCommand, isMuted }) {
  const Impl = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Impl) return null;

  const rec = new Impl();
  rec.continuous = true;
  rec.interimResults = false;
  rec.lang = "en-US";

  let wanted = false;

  rec.onresult = (e) => {
    if (isMuted?.()) return;
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      const said = e.results[i][0].transcript;
      const cmd = parseCommand(said);
      if (cmd) onCommand(cmd, said);
    }
  };

  rec.onend = () => {
    if (!wanted) return;
    // Restart, but not so fast that a permission error becomes a hot loop.
    setTimeout(() => {
      try {
        rec.start();
      } catch {
        /* already running */
      }
    }, 250);
  };

  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") wanted = false;
  };

  return {
    start() {
      wanted = true;
      try {
        rec.start();
      } catch {
        /* already running */
      }
    },
    stop() {
      wanted = false;
      try {
        rec.stop();
      } catch {
        /* not running */
      }
    },
  };
}
