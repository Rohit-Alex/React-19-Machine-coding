import { useId } from "react";

/**
 * Scenario 1: one useId() call per component, reused as a prefix for every
 * related id/htmlFor/aria-describedby pair. Render this form twice — the
 * ids never clash even though both instances share the same JSX.
 */
function PasswordField() {
  const id = useId();

  return (
    <div className="demo-card">
      <label htmlFor={`${id}-password`}>Password:</label>{" "}
      <input
        id={`${id}-password`}
        type="password"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`}>Must be at least 18 characters.</p>
      <p style={{ fontSize: 12, opacity: 0.7 }}>generated prefix: {id}</p>
    </div>
  );
}

export const SharedPrefix = () => {
  return (
    <div className="demo-card">
      <h4>1. One id, shared across related elements</h4>
      <p>
        Two instances of the same <code>PasswordField</code> below — each
        calls <code>useId()</code> once and derives every id it needs from
        it. Inspect the DOM: the prefixes differ, so <code>htmlFor</code> and{" "}
        <code>aria-describedby</code> still point at the right element in
        each instance instead of colliding.
      </p>
      <PasswordField />
      <PasswordField />
    </div>
  );
};
