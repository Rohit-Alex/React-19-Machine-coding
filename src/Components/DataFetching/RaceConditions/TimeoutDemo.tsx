import { useEffect, useRef, useState } from "react";
import { fetchReport } from "./fakeApi";

type State =
  | { name: "idle" }
  | { name: "loading" }
  | { name: "done"; rows: number; generatedAt: string }
  | { name: "cancelled" }
  | { name: "timedOut" }
  | { name: "error"; message: string };

export const TimeoutDemo = () => {
  const [timeoutMs, setTimeoutMs] = useState(3000);
  const [state, setState] = useState<State>({ name: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  // Leaving the page cancels whatever is still running.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const load = async () => {
    controllerRef.current?.abort(); // Clicking Load again replaces the old request.
    const controller = new AbortController();
    controllerRef.current = controller;
    // One signal that fires on whichever comes first: the user's Cancel, or the timeout.
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);

    setState({ name: "loading" });
    try {
      const report = await fetchReport(signal);
      setState({ name: "done", ...report });
    } catch (error) {
      if (controller !== controllerRef.current) return; // A newer Load took over.
      if (!signal.aborted) setState({ name: "error", message: String(error) });
      // The reason says *why*: a timeout is TimeoutError, our Cancel is AbortError.
      else if (signal.reason instanceof DOMException && signal.reason.name === "TimeoutError") setState({ name: "timedOut" });
      else setState({ name: "cancelled" });
    }
  };

  return (
    <div className="demo-card">
      <h4>Timeout + cancel with one signal</h4>
      <p>
        The report takes 2s. With a 1s timeout it times out; with 3s it loads unless you press
        Cancel.
      </p>
      <div className="demo-actions">
        <label>
          Timeout{" "}
          <select value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))}>
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
          </select>
        </label>
        <button onClick={load}>{state.name === "loading" ? "Restart" : "Load report"}</button>
        <button onClick={() => controllerRef.current?.abort()} disabled={state.name !== "loading"}>
          Cancel
        </button>
      </div>
      <p role="status">
        {state.name === "loading" && "Loading…"}
        {state.name === "done" && `✅ ${state.rows} rows, generated ${state.generatedAt}`}
        {state.name === "cancelled" && "Cancelled. (Not an error — you asked for it.)"}
        {state.name === "timedOut" && "⏱ The server took too long. Try again?"}
        {state.name === "error" && `❌ ${state.message}`}
      </p>
    </div>
  );
};
