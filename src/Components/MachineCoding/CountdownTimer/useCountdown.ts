import { useEffect, useState } from "react";

export function calculateRemainingTime(remainingMs: number) {
  // Clamp: once the target has passed, Math.floor of a negative number is -1,
  // so without this every unit would show -1.
  // Round UP: with 0.4s left the display should say 1, and reach 0 exactly
  // when time is up — like a microwave. Rounding down shows 0 a second early.
  const totalSecs = Math.ceil(Math.max(0, remainingMs) / 1000);
  return {
    days: Math.floor(totalSecs / 86_400),
    hrs: Math.floor(totalSecs / 3600) % 24,
    mins: Math.floor(totalSecs / 60) % 60,
    secs: totalSecs % 60,
  };
}

/*
 * Counts down to a moment on the calendar, given as epoch milliseconds.
 *
 * Uses Date.now(), not performance.now(): the target is a wall-clock time
 * ("6:30pm tonight"), so we have to ask the wall clock how far away it is.
 *
 * State is just `now` — the input. days / hrs / mins / secs are worked out
 * from it on every render, never stored.
 */
export function useCountdown(targetDateInMs: number | null) {
  // Lazy init: correct on the very first render, not blank for a second.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetDateInMs === null) return;
    let timeoutId = 0;

    const tick = () => {
      window.clearTimeout(timeoutId);
      const currentTimeInMs = Date.now();
      setNow(currentTimeInMs);
      const remainingTime = targetDateInMs - currentTimeInMs;
      if (remainingTime <= 0) return; // Done: stop scheduling.
      // Wake up exactly when the displayed second changes. setInterval(1000)
      // runs on whatever phase you started at, and can skip or repeat a second.
      timeoutId = window.setTimeout(tick, remainingTime % 1000 || 1000);
    };

    // Background tabs throttle timers heavily. Catch up the moment the tab is
    // visible again rather than waiting for the next throttled tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };

    tick(); // Run once straight away, not 1s later.
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [targetDateInMs]); // A new target restarts the countdown.

  const remainingMs = targetDateInMs === null ? 0 : targetDateInMs - now;
  return {
    ...calculateRemainingTime(remainingMs),
    isDone: targetDateInMs !== null && remainingMs <= 0,
  };
}
