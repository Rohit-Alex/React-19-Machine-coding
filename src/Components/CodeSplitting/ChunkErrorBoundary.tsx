import { Component, type ReactNode } from "react";

/*
 * A chunk can fail to load: flaky network, or — very common — a new deploy
 * deleted the old file names while this tab was still open. Without a
 * boundary, the whole app unmounts. Error boundaries are still class
 * components in React 19.
 */
export class ChunkErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert">
        <p>Couldn't load this part of the page. ({this.state.error.message})</p>
        <button
          onClick={() => {
            this.setState({ error: null });
            this.props.onRetry();
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
