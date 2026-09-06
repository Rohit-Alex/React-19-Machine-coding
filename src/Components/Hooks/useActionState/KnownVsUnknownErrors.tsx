import {
  Component,
  startTransition,
  useActionState,
  useState,
} from "react";

type NameState = { name: string; error: string | null };

class KnownError extends Error {}

function saveName(newName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const normalized = newName.trim().toLowerCase();
      if (normalized === "error") {
        reject(new KnownError("That name is already taken."));
      } else if (normalized === "crash") {
        reject(new Error("Unexpected server failure."));
      } else {
        resolve(newName);
      }
    }, 800);
  });
}

class NameErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <p role="alert">
          Unexpected error: {this.state.error.message}{" "}
          <button onClick={this.reset}>Try again</button>
        </p>
      );
    }
    return this.props.children;
  }
}

function NameEditor() {
  const [{ name, error }, dispatchAction, isPending] = useActionState(
    async (previousState: NameState, newName: string) => {
      try {
        const savedName = await saveName(newName);
        return { name: savedName, error: null };
      } catch (err) {
        if (err instanceof KnownError) {
          return { name: previousState.name, error: err.message };
        }
        throw err;
      }
    },
    { name: "Ada", error: null },
  );
  const [draft, setDraft] = useState("");

  return (
    <div>
      <p>
        Current name: <strong>{name}</strong>
      </p>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder='try "error" or "crash"'
      />{" "}
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            dispatchAction(draft);
          })
        }
      >
        {isPending ? "Saving..." : "Save"}
      </button>
      {error && <p role="alert">Known error: {error}</p>}
    </div>
  );
}

export const KnownVsUnknownErrors = () => {
  return (
    <div>
      <h3>Known vs. unknown errors</h3>
      <p>
        <code>dispatchAction</code> must be called from an Action, so this
        plain <code>onClick</code> wraps it in <code>startTransition</code>.
        Typing "error" throws a <code>KnownError</code> that{" "}
        <code>reducerAction</code> catches and returns as state. Typing
        "crash" throws an ordinary <code>Error</code> that{" "}
        <code>reducerAction</code> deliberately re-throws — per the docs,
        React skips any subsequently queued <code>dispatchAction</code> calls
        once <code>reducerAction</code> throws, so it's the nearest error
        boundary that catches it instead (a hand-written class component,
        same pattern as <code>use.md</code>, since this repo has no{" "}
        <code>react-error-boundary</code> dependency).
      </p>
      <NameErrorBoundary>
        <NameEditor />
      </NameErrorBoundary>
    </div>
  );
};
