import { useState } from "react";
import { Menu } from "./Menu";
import { Tooltip } from "./Tooltip";
import "../../Hooks/hook-demo.css";

const CLIPPED_BOX = { height: 70, overflow: "hidden", border: "1px solid var(--border)", borderRadius: 6, padding: "36px 8px 8px" } as const;

export const PortalsDemo = () => {
  const [usePortal, setUsePortal] = useState(false);
  const [stopPropagation, setStopPropagation] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((prev) => [line, ...prev].slice(0, 4));

  return (
    <section>
      <h2>Portals beyond modals: tooltips and menus</h2>
      <p>
        Writeup: <code>src/Components/Patterns/Portals/Portals.md</code>. Floating UI inside a box
        with <code>overflow: hidden</code> or a scroll container gets cut off — unless it's moved to{" "}
        <code>&lt;body&gt;</code>.
      </p>

      <div className="demo-card">
        <h4>Tooltip in a clipped box</h4>
        <label>
          <input type="checkbox" checked={usePortal} onChange={(e) => setUsePortal(e.target.checked)} /> Render the
          tooltip in a portal
        </label>
        <div style={CLIPPED_BOX}>
          Card with <code>overflow: hidden</code>{" "}
          <Tooltip usePortal={usePortal} text="Prices include tax. Hover me, or Tab to the button and press Escape to hide me.">
            <button aria-label="About prices">ⓘ</button>
          </Tooltip>
        </div>
      </div>

      <div className="demo-card">
        <h4>Menu inside a scrolling list, and the bubbling surprise</h4>
        <label>
          <input type="checkbox" checked={stopPropagation} onChange={(e) => setStopPropagation(e.target.checked)} /> Stop
          clicks from bubbling to the card
        </label>
        <div style={{ height: 140, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6, padding: 8, marginTop: 8 }}>
          {["Invoice #1042", "Invoice #1043", "Invoice #1044", "Invoice #1045"].map((name) => (
            // A clickable card. The menu is portaled to <body>, but React
            // events still bubble to this onClick through the React tree.
            <div
              key={name}
              onClick={() => add(`Card clicked: opened ${name}`)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, marginBottom: 6, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}
            >
              {name}
              <Menu label="Actions" items={["Download", "Duplicate", "Delete"]} stopPropagation={stopPropagation} onSelect={(item) => add(`${item} ${name}`)} />
            </div>
          ))}
        </div>
        <ul style={{ fontSize: 13 }}>
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="demo-card">
        <h4>Native: the popover attribute</h4>
        <p>
          No portal and no JavaScript: <code>popover</code> puts the element in the browser's top
          layer (above every <code>overflow</code> and <code>z-index</code>), and closes it on
          Escape or a click outside.
        </p>
        <div style={CLIPPED_BOX}>
          <button popoverTarget="native-popover">Show native popover</button>
          <div id="native-popover" popover="auto" style={{ padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
            I'm in the top layer, so the clipped box can't cut me off.
          </div>
        </div>
      </div>
    </section>
  );
};
