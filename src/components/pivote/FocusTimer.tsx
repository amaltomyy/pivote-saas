import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, Timer } from "lucide-react";

const PRESETS = [5, 15, 25];

function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [
      { freq: 587.33, at: 0 },
      { freq: 880, at: 0.28 },
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 1.3);
    });
    window.setTimeout(() => void ctx.close(), 2200);
  } catch {
    /* audio is best-effort */
  }
}

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer({
  taskLabel,
  onFocusComplete,
}: {
  taskLabel: string | null;
  onFocusComplete: (minutes: number) => void;
}) {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breakEnabled, setBreakEnabled] = useState(true);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [total, setTotal] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const completeRef = useRef(onFocusComplete);
  completeRef.current = onFocusComplete;

  const reset = useCallback(
    (minutes: number, nextMode: "focus" | "break") => {
      setMode(nextMode);
      setTotal(Math.max(1, minutes) * 60);
      setRemaining(Math.max(1, minutes) * 60);
      setRunning(false);
    },
    [],
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining > 0) {
      document.title = `(${mmss(remaining)}) Pivot'e Focus`;
    } else {
      document.title = "Pivot'e — Calm Goal Execution with Proof of Work";
    }
  }, [running, remaining]);

  useEffect(() => {
    if (!running || remaining > 0) return;
    setRunning(false);
    playChime();
    if (mode === "focus") {
      completeRef.current(workMinutes);
      if (breakEnabled) reset(breakMinutes, "break");
      else reset(workMinutes, "focus");
    } else {
      reset(workMinutes, "focus");
    }
  }, [remaining, running, mode, workMinutes, breakMinutes, breakEnabled, reset]);

  const r = 52;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? (total - remaining) / total : 0;

  return (
    <section className="panel-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          {mode === "focus" ? (
            <Timer className="h-4 w-4 text-teal" />
          ) : (
            <Coffee className="h-4 w-4 text-teal" />
          )}
          {mode === "focus" ? "Focus Timer" : "Break Timer"}
        </h2>
        <span className="truncate text-[11px] text-muted-foreground">
          {taskLabel ? taskLabel : "No task selected"}
        </span>
      </div>

      <div className="mt-3 grid place-items-center">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="9"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--accent-teal)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-2xl font-black tabular-nums text-foreground">
            {mmss(remaining)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setWorkMinutes(m);
              reset(m, "focus");
            }}
            className={`h-9 rounded-full px-3 text-xs font-semibold transition ${
              workMinutes === m && mode === "focus"
                ? "bg-teal text-white"
                : "border border-glass-border text-foreground hover:bg-accent"
            }`}
          >
            {m}m
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={180}
          value={workMinutes}
          aria-label="Custom focus minutes"
          onChange={(e) => {
            const v = Math.min(180, Math.max(1, Number(e.target.value) || 1));
            setWorkMinutes(v);
            if (!running && mode === "focus") reset(v, "focus");
          }}
          className="h-9 w-16 rounded-full border border-glass-border bg-transparent px-3 text-center text-xs text-foreground outline-none"
        />
      </div>

      <label className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={breakEnabled}
          onChange={(e) => setBreakEnabled(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent-teal)]"
        />
        Break after focus
        <input
          type="number"
          min={1}
          max={60}
          value={breakMinutes}
          aria-label="Break minutes"
          disabled={!breakEnabled}
          onChange={(e) =>
            setBreakMinutes(Math.min(60, Math.max(1, Number(e.target.value) || 1)))
          }
          className="h-8 w-14 rounded-full border border-glass-border bg-transparent px-2 text-center text-xs text-foreground outline-none disabled:opacity-40"
        />
        min
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((v) => !v)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.99]"
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          aria-label="Reset timer"
          onClick={() => reset(mode === "focus" ? workMinutes : breakMinutes, mode)}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-glass-border text-muted-foreground transition hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
