import { useState, useTransition } from "react";

const POST_COUNT = 300;
const MS_PER_POST = 1;
const TOTAL_MS = POST_COUNT * MS_PER_POST;

function burn(ms: number) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    // block whatever fiber we're inside for `ms`
  }
}

/**
 * Instrumentation. `postWorkUnits` counts how much post-rendering work React
 * actually performed — *including* work it later threw away. An interrupted
 * Transition discards its entire work-in-progress tree, so this number climbs
 * past POST_COUNT as soon as you start interrupting. The excess is the waste.
 */
const renderStats = { postWorkUnits: 0 };
declare global {
  interface Window {
    __renderStats?: typeof renderStats;
  }
}
if (typeof window !== "undefined") window.__renderStats = renderStats;

/* ------------------------------------------------------------------ *
 * VERSION A — 300 fibers × 1ms.  Interruptible.
 *
 *   PostsTab ─ SlowPost#1 ─ SlowPost#2 ─ … ─ SlowPost#300
 *
 * React's work loop calls performUnitOfWork() once per SlowPost and checks
 * shouldYield() *between* those calls. The frame budget is 5ms, so after
 * roughly every 5 posts React pauses, lets the browser paint and flush
 * input, then resumes. 300ms of work becomes ~60 slices of ~5ms.
 * ------------------------------------------------------------------ */
function SlowPost({ index }: { index: number }) {
  renderStats.postWorkUnits += 1;
  burn(MS_PER_POST);
  return <li className="item">Post #{index + 1}</li>;
}

function PostsTabSliced() {
  const items = [];
  for (let i = 0; i < POST_COUNT; i++) {
    items.push(<SlowPost key={i} index={i} />);
  }
  return <ul className="items">{items}</ul>;
}

/* ------------------------------------------------------------------ *
 * VERSION B — 1 fiber × 300ms.  NOT interruptible.
 *
 *   PostsTab   (one fiber containing a 300ms synchronous loop)
 *
 * Exactly the same total work, but React asked for "one unit of work" and
 * that unit does not return for 300ms. shouldYield() is only consulted
 * between performUnitOfWork calls, never inside one — so there is no
 * checkpoint at which React could notice your click. startTransition is
 * powerless here: the main thread is blocked solid, behaving exactly as if
 * you had never wrapped the update at all.
 * ------------------------------------------------------------------ */
function PostsTabMonolithic() {
  renderStats.postWorkUnits += POST_COUNT; // same total work, one fiber
  burn(TOTAL_MS);
  const items = [];
  for (let i = 0; i < POST_COUNT; i++) {
    items.push(
      <li key={i} className="item">
        Post #{i + 1}
      </li>,
    );
  }
  return <ul className="items">{items}</ul>;
}

type Tab = "about" | "posts";

export const TabSwitchTransition = () => {
  // `tab` drives the expensive render and lags behind (Transition state).
  // `targetTab` updates urgently and drives the buttons, so the controls stay
  // truthful and clickable while `tab` catches up.
  const [tab, setTab] = useState<Tab>("about");
  const [targetTab, setTargetTab] = useState<Tab>("about");
  const [useTransitionFlag, setUseTransitionFlag] = useState(true);
  const [sliced, setSliced] = useState(true);
  const [isPending, startTransition] = useTransition();

  /**
   * ⚠️ BUG #1 THIS DEMO EXISTS TO TEACH — Transition state is stale while
   * pending, so never drive interactive affordances off it.
   *
   *   - You're on "about", so the about button is disabled. Correct.
   *   - You click "posts". The Transition starts, but `tab` is STILL "about"
   *     until it commits.
   *   - So for the whole render the about button stays *disabled* — you
   *     physically cannot click back. The click is swallowed.
   *   - Posts commits and wins. It reads as "I clicked about and it ignored
   *     me, and the slow tab kept loading."
   *
   * Fix: a SECOND, urgent state (`targetTab`) for anything the user
   * interacts with; leave the expensive render on the Transition state.
   * They are separate state variables, so each stays single-priority — we're
   * not mixing lanes on one variable, which is its own bug.
   *
   * ⚠️ BUG #2 — see the `sliced` toggle. startTransition only buys you
   * interruptibility if the work is actually divisible into fibers.
   */
  const selectTab = (next: Tab) => {
    setTargetTab(next); // urgent — buttons stay usable immediately
    if (useTransitionFlag) {
      startTransition(() => setTab(next)); // low priority — the costly part
    } else {
      setTab(next);
    }
  };

  return (
    <div className="demo-card">
      <h4>1. Non-blocking tab switch with a pending indicator</h4>
      <p>
        Click "posts (slow)", then immediately click "about". With{" "}
        <b>sliced</b> on, the page stays responsive and about wins instantly.
        Turn <b>sliced</b> off and the identical {TOTAL_MS}ms of work freezes
        the page — even though <code>startTransition</code> is still wrapping
        the update. Interruptibility is a property of how the work is split
        into fibers, not of whether you called <code>startTransition</code>.
      </p>
      <label>
        <input
          type="checkbox"
          checked={useTransitionFlag}
          onChange={(e) => setUseTransitionFlag(e.target.checked)}
        />{" "}
        wrap tab switch in startTransition
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={sliced}
          onChange={(e) => setSliced(e.target.checked)}
        />{" "}
        sliced work — {POST_COUNT} fibers × {MS_PER_POST}ms (uncheck for 1
        fiber × {TOTAL_MS}ms)
      </label>
      <div className="demo-actions">
        <button
          onClick={() => {
            selectTab("about");
          }}
          disabled={targetTab === "about"}
        >
          about
        </button>
        <button
          onClick={() => {
            selectTab("posts");
          }}
          disabled={targetTab === "posts"}
        >
          posts (slow)
        </button>
      </div>
      {isPending && <p>⏳ pending…</p>}
      {tab === "about" ? (
        <p>About tab content — instant.</p>
      ) : sliced ? (
        <PostsTabSliced />
      ) : (
        <PostsTabMonolithic />
      )}
    </div>
  );
};
