import { useEffect, useRef } from "react";

/*
 * Shows how many times the component it sits in has *committed* (rendered
 * and been put on screen), and flashes on each one.
 *
 * Counted in an effect, written straight to the DOM: setting state here
 * would itself cause a render and count forever. StrictMode runs mount
 * effects twice in development; the render token stops that counting twice.
 */
export const RenderCount = ({ label }: { label?: string }) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const count = useRef(0);
  const lastToken = useRef<object | null>(null);
  const token = {}; // A new object every render.

  useEffect(() => {
    if (lastToken.current === token) return; // Same render, effect re-run by StrictMode.
    lastToken.current = token;
    count.current++;
    const badge = badgeRef.current;
    if (!badge) return;
    badge.textContent = `${label ?? "renders"}: ${count.current}`;
    badge.animate([{ background: "#e8a317" }, { background: "transparent" }], { duration: 600 });
  });

  return (
    <span
      ref={badgeRef}
      aria-hidden="true" // A debugging aid, not content.
      style={{ fontSize: 11, fontFamily: "monospace", padding: "1px 6px", border: "1px solid var(--border)", borderRadius: 4 }}
    />
  );
};

/** Burns `ms` of CPU, to make a component visibly slow. Demo only. */
export function slowDown(ms: number) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    // ponytail: busy loop on purpose — stands in for a heavy render.
  }
}
