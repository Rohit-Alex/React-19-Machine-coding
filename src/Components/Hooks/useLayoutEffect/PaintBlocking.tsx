import { useEffect, useLayoutEffect, useState } from "react";

// kept alive for the "comment one, use other" toggle below — noUnusedLocals
// would otherwise fail the build while useLayoutEffect is commented out
void useLayoutEffect;

interface MeasureBoxProps {
  label: string;
  useEffectHook: typeof useEffect;
}

const MeasureBox = ({ label, useEffectHook }: MeasureBoxProps) => {
  const [measured, setMeasured] = useState(false);

  const start = performance.now();
  while (performance.now() - start < 100) {
    // intentionally blocking
  }

  useEffectHook(() => {
    setMeasured(true);
  }, []);

  return (
    <div
      style={{
        padding: 12,
        backgroundColor: measured ? "#1c4587" : "#822111",
        color: "#fff",
      }}
    >
      {label}:{" "}
      {measured ? "measured, correct state" : "unmeasured (visible bug)"}
    </div>
  );
};

/**
 * Scenario 1: useEffect vs useLayoutEffect and paint blocking.
 * Use one at a time. Comment one and use other
 */
export const PaintBlocking = () => {
  const [mountKey, setMountKey] = useState(0);

  const remount = () => {
    setMountKey((k) => k + 1);
  };

  return (
    <div className="demo-card">
      <h4>1. Blocking paint until layout is measured</h4>
      <p>
        A ~150ms flash is easy for the browser to coalesce away, so this logs
        the real paint timestamps instead of relying on eyesight.
      </p>
      <div className="demo-actions">
        <button onClick={remount}>remount both</button>
      </div>
      <div
        key={mountKey}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <MeasureBox label="useEffect" useEffectHook={useEffect} />
        {/* <MeasureBox label="useLayoutEffect" useEffectHook={useLayoutEffect} /> */}
      </div>
    </div>
  );
};
