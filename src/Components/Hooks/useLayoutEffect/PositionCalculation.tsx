import { useState, useRef, useEffect, useLayoutEffect } from "react";

// kept alive for the "useLayoutEffect -> useEffect" toggle below —
// noUnusedLocals would otherwise fail the build while unused
void useLayoutEffect;

export const PositionCalculation = () => {
  const [top, setTop] = useState(0);
  const ref = useRef(null);

  /* change once to useLayoutEffect -> useEffect */
  useEffect(() => {
    const node = ref.current as unknown as HTMLDivElement;
    if (node) {
      const rect = node.getBoundingClientRect();
      setTop(rect.top);
      console.log(rect);
    }
  }, []);

  const now = performance.now();
  while (performance.now() - now < 300) {}

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        top: 20,
        left: 20,
        backgroundColor: "wheat",
        width: "400px",
        height: "200px",
        marginBlockEnd: "80px",
      }}
    >
      Box above {top}
    </div>
  );
};
