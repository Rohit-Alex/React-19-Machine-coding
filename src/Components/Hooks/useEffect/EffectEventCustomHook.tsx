import { useEffect, useEffectEvent, useState } from "react";

// Without useEffectEvent, a new inline `callback` every render would force
// this Effect to tear down and restart the interval on every render too -
// even though only `delay` should ever do that.
function useInterval(callback: () => void, delay: number) {
  const onTick = useEffectEvent(callback);

  useEffect(() => {
    const id = setInterval(onTick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

export const EffectEventCustomHook = () => {
  const [count, setCount] = useState(0);
  const [incrementBy, setIncrementBy] = useState(1);
  const [delay, setDelay] = useState(1000);

  useInterval(() => {
    setCount((c) => c + incrementBy);
  }, delay);

  return (
    <div className="demo-card">
      <h4>useEffectEvent inside a custom Hook</h4>
      <p>
        count: {count}. A brand-new arrow function is passed to{" "}
        <code>useInterval</code> on every render, but the interval never
        resets because of it - bump "increment by" and the ticking rhythm
        never skips a beat. Only "delay" restarts it.
      </p>
      <div className="demo-actions">
        <button onClick={() => setIncrementBy((n) => n + 1)}>
          increment by ({incrementBy})
        </button>
        <button onClick={() => setDelay((d) => (d === 1000 ? 300 : 1000))}>
          toggle delay ({delay}ms)
        </button>
      </div>
    </div>
  );
};
