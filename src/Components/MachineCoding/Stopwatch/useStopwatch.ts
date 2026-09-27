import { useEffect, useReducer, useState } from "react";

type Status = "idle" | "running" | "paused";

interface State {
  status: Status;
  /** performance.now() when the current run started; null when not running. */
  startedAt: number | null;
  /** Time banked from earlier runs, before the last pause. */
  accumulated: number;
  /** Total elapsed time at each lap press (not the lap's own length). */
  laps: number[];
}

// `now` travels in the action so the reducer stays pure. Reading the clock is
// a side effect; it belongs in the event handler, not in here.
type Action =
  | { type: "start"; now: number }
  | { type: "pause"; now: number }
  | { type: "lap"; now: number }
  | { type: "reset" };

const initialState: State = {
  status: "idle",
  startedAt: null,
  accumulated: 0,
  laps: [],
};

function elapsedAt(state: State, now: number): number {
  return state.startedAt === null
    ? state.accumulated
    : state.accumulated + Math.max(0, now - state.startedAt);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      if (state.status === "running") return state;
      return { ...state, status: "running", startedAt: action.now };

    case "pause":
      if (state.status !== "running") return state;
      return {
        ...state,
        status: "paused",
        startedAt: null,
        accumulated: elapsedAt(state, action.now),
      };

    case "lap":
      if (state.status !== "running") return state;
      return { ...state, laps: [...state.laps, elapsedAt(state, action.now)] };

    case "reset":
      return initialState;
  }
}

export function useStopwatch() {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Only exists to trigger re-renders while running. The time itself always
  // comes from timestamps, never from counting these.
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (state.status !== "running") return;
    let frameId = 0;
    const loop = () => {
      setNow(performance.now());
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [state.status]);

  return {
    status: state.status,
    elapsed: elapsedAt(state, now),
    laps: state.laps,
    start: () => dispatch({ type: "start", now: performance.now() }),
    pause: () => dispatch({ type: "pause", now: performance.now() }),
    lap: () => dispatch({ type: "lap", now: performance.now() }),
    reset: () => dispatch({ type: "reset" }),
  };
}

export function formatStopwatch(rawMs: number): string {
  // performance.now() has fractions of a millisecond (e.g. 661.8999999761581).
  const ms = Math.floor(rawMs);
  const milliseconds = ms % 1000;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const pad3 = (n: number) => String(n).padStart(3, "0");

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}:${pad3(milliseconds)}`;
}
