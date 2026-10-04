import { Component, useState, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: (props: { error: Error; reset: () => void }) => ReactNode;
  /** When any of these change, clear the error and try rendering again. */
  resetKeys?: unknown[];
  onError?: (error: Error, info: ErrorInfo) => void;
}

/*
 * Error boundaries are still class components in React 19.2: only classes
 * have getDerivedStateFromError / componentDidCatch. The react-error-boundary
 * package wraps this same idea.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  // During render: switch to the fallback.
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  // After commit: side effects — logging, reporting to Sentry, etc.
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: Props) {
    // The data that caused the crash changed: give the children another go.
    const keys = this.props.resetKeys ?? [];
    const prevKeys = prev.resetKeys ?? [];
    if (this.state.error && keys.some((key, i) => !Object.is(key, prevKeys[i]))) this.reset();
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback({ error: this.state.error, reset: this.reset }) : this.props.children;
  }
}

/**
 * Boundaries only catch errors thrown while *rendering*. This hands an error
 * from an event handler or async code to the nearest boundary: a state
 * updater that throws runs during the next render, so the boundary sees it.
 */
export function useShowBoundary() {
  const [, setState] = useState();
  return (error: unknown) =>
    setState(() => {
      throw error;
    });
}
