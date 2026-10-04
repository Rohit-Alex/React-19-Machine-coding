import { createContext, use, type ComponentType } from "react";

export const FlagsContext = createContext<Record<string, boolean>>({});

const nameOf = (C: { displayName?: string; name: string }) => C.displayName || C.name || "Component";

/**
 * Renders the component only when a feature flag is on.
 * A HOC is a function: component in, new component out.
 */
export function withFeatureFlag<P extends object>(Component: ComponentType<P>, flag: string, Fallback: ComponentType = () => null) {
  function WithFeatureFlag(props: P) {
    const flags = use(FlagsContext);
    // Pass every prop through — including `ref`, which is a normal prop in React 19.
    return flags[flag] ? <Component {...props} /> : <Fallback />;
  }
  // So DevTools shows "withFeatureFlag(SearchBox)", not "WithFeatureFlag".
  WithFeatureFlag.displayName = `withFeatureFlag(${nameOf(Component)})`;
  return WithFeatureFlag;
}

/** Wraps the component in a labelled border — stands in for logging, analytics, theming… */
export function withOutline<P extends object>(Component: ComponentType<P>, label: string) {
  function WithOutline(props: P) {
    return (
      <div style={{ border: "1px dashed #e8a317", padding: 6, borderRadius: 6 }}>
        <small style={{ color: "#e8a317" }}>{label}</small>
        <Component {...props} />
      </div>
    );
  }
  WithOutline.displayName = `withOutline(${nameOf(Component)})`;
  return WithOutline;
}
