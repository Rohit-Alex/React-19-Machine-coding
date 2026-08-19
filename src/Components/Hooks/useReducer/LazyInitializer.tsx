import { useReducer, useState } from "react";

let constructions = 0;

function createInitialState(seed: number) {
  constructions++;
  return { count: seed };
}

type Action = { type: "incremented" };

function reducer(state: { count: number }, action: Action) {
  switch (action.type) {
    case "incremented":
      return { count: state.count + 1 };
    default:
      throw new Error("Unknown action");
  }
}

/**
 * Scenario 2: useReducer(reducer, seed, init) — init(seed) runs once, at
 * mount, no matter how many times the component re-renders afterwards.
 * Different call shape than useState's lazy init, same goal.
 */
export const LazyInitializer = () => {
  const [state, dispatch] = useReducer(reducer, 0, createInitialState);
  const [, forceRender] = useState(0);

  return (
    <div className="demo-card">
      <h4>2. Lazy initializer (3-argument form)</h4>
      <p>
        <code>createInitialState</code> only runs once no matter how many
        times this re-renders — click "re-render" and watch the count stay
        put; click "increment" to see the reducer actually update state.
      </p>
      <div className="demo-actions">
        <button onClick={() => dispatch({ type: "incremented" })}>
          increment
        </button>
        <button onClick={() => forceRender((n) => n + 1)}>re-render</button>
      </div>
      <p>count: {state.count}</p>
      <p>createInitialState calls: {constructions}</p>
    </div>
  );
};
