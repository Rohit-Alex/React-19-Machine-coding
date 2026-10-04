import { useRef, useState } from "react";
import { VariableVirtualList, type VirtualListHandle } from "./VariableVirtualList";
import "../../Hooks/hook-demo.css";

const WORDS = "the quick brown fox jumps over a lazy dog while react renders only what you can see on screen".split(" ");
const AUTHORS = ["Asha", "Ben", "Chen", "Diya", "Erik"];

// 10,000 chat messages, 3 to ~60 words each. Deterministic, so every load looks the same.
const MESSAGES = Array.from({ length: 10_000 }, (_, i) => {
  const length = 3 + ((i * 7919) % 58);
  return {
    id: i,
    author: AUTHORS[i % AUTHORS.length],
    text: Array.from({ length }, (_, w) => WORDS[(i + w * 31) % WORDS.length]).join(" "),
  };
});

export const VirtualizationDeepDiveDemo = () => {
  const listRef = useRef<VirtualListHandle>(null);
  const [width, setWidth] = useState(520);
  const [jumpTo, setJumpTo] = useState("5000");
  const [showNative, setShowNative] = useState(false);

  return (
    <section>
      <h2>List virtualisation deep dive: rows of different heights</h2>
      <p>
        Writeup: <code>src/Components/Performance/VirtualizationDeepDive/VirtualizationDeepDive.md</code>.
        The Phase 2 <code>VirtualList</code> assumed every row is the same height. Real lists (chat,
        feeds) aren't.
      </p>

      <div className="demo-card">
        <h4>Measured rows, 10,000 messages</h4>
        <div className="demo-actions">
          <label>
            Width{" "}
            <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
              <option value={320}>Narrow (rows re-wrap and re-measure)</option>
              <option value={520}>Normal</option>
            </select>
          </label>
          <input aria-label="Message number" value={jumpTo} onChange={(e) => setJumpTo(e.target.value)} style={{ width: 70 }} />
          <button onClick={() => listRef.current?.scrollToIndex(Number(jumpTo) - 1)}>Jump to message</button>
        </div>
        <div style={{ maxWidth: width }}>
          <VariableVirtualList
            ref={listRef}
            ariaLabel="Messages"
            items={MESSAGES}
            getKey={(m) => m.id}
            height={360}
            renderItem={(m, index) => (
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                <strong>
                  #{index + 1} {m.author}
                </strong>
                <div>{m.text}</div>
              </div>
            )}
          />
        </div>
      </div>

      <div className="demo-card">
        <h4>The no-JavaScript alternative: content-visibility</h4>
        <p>
          All 10,000 rows are in the DOM, but the browser skips laying out and painting the ones
          off screen. Slower to mount than the virtual list (React still creates every row), but
          find-in-page, screen readers and scroll position just work.
        </p>
        <button onClick={() => setShowNative((s) => !s)}>{showNative ? "Remove" : "Render 10,000 rows"}</button>
        {showNative && (
          <div style={{ height: 360, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6, marginTop: 8, maxWidth: width }}>
            {MESSAGES.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border)",
                  contentVisibility: "auto",
                  // A placeholder size for skipped rows; "auto" remembers the real one once seen.
                  containIntrinsicSize: "auto 64px",
                }}
              >
                <strong>
                  #{m.id + 1} {m.author}
                </strong>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
