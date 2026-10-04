import { useRef } from "react";
import { useIsOnline } from "../../Hooks/useIsOnline/useIsOnline";
import { HoverList } from "./HoverList";
import { OnlineStatus, PointerTracker, usePointer } from "./pointer";
import "../../Hooks/hook-demo.css";

const BOX = { height: 90, border: "1px dashed var(--border)", borderRadius: 6, padding: 8, fontSize: 13 } as const;

// Two pieces of logic combined with render props: each adds a level of nesting.
const WithRenderProps = () => (
  <OnlineStatus>
    {(online) => (
      <PointerTracker>
        {(pointer) => (
          <div style={BOX}>
            {online ? "🟢 online" : "🔴 offline"} · pointer {pointer.inside ? `${pointer.x}, ${pointer.y}` : "outside"}
          </div>
        )}
      </PointerTracker>
    )}
  </OnlineStatus>
);

// The same with hooks: flat, and both values are plain variables in scope.
const WithHooks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const online = useIsOnline();
  const pointer = usePointer(ref);
  return (
    <div ref={ref} style={BOX}>
      {online ? "🟢 online" : "🔴 offline"} · pointer {pointer.inside ? `${pointer.x}, ${pointer.y}` : "outside"}
    </div>
  );
};

const PLANS = [
  { id: "free", name: "Free", price: "₹0" },
  { id: "pro", name: "Pro", price: "₹499/mo" },
  { id: "team", name: "Team", price: "₹1,999/mo" },
];

export const RenderPropsVsHooksDemo = () => (
  <section>
    <h2>Render props vs custom hooks</h2>
    <p>
      Writeup: <code>src/Components/Patterns/RenderPropsVsHooks/RenderPropsVsHooks.md</code>. The
      same logic (online status + pointer position) shared both ways.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      <div className="demo-card">
        <h4>Render props</h4>
        <WithRenderProps />
      </div>
      <div className="demo-card">
        <h4>Hooks</h4>
        <WithHooks />
      </div>
    </div>
    <div className="demo-card">
      <h4>Where render props still win: drawing items with the component's state</h4>
      <HoverList
        items={PLANS}
        getKey={(plan) => plan.id}
        renderItem={(plan, { isHovered }) => (
          <span style={{ fontWeight: isHovered ? 700 : 400 }}>
            {isHovered ? "👉 " : ""}
            {plan.name} — {plan.price}
          </span>
        )}
      />
    </div>
  </section>
);
