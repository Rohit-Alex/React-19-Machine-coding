import {
  createContext,
  memo,
  useContext,
  useReducer,
  useRef,
  type Dispatch,
} from "react";

type Action = { type: "incremented" };

function reducer(count: number, action: Action): number {
  switch (action.type) {
    case "incremented":
      return count + 1;
    default:
      throw new Error("Unknown action");
  }
}

const CountContext = createContext(0);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

/**
 * Scenario 2: splitting a changing value and its stable updater into two
 * contexts. CountDisplay reads CountContext and re-renders on every
 * increment; IncrementButton only reads DispatchContext (stable identity,
 * see useReducer.md) and — because it's memoized — never re-renders at all.
 */
export const SplitContext = () => {
  const [count, dispatch] = useReducer(reducer, 0);

  return (
    <div className="demo-card">
      <h4>2. Splitting contexts to limit re-renders</h4>
      <p>
        Watch the render counts: <code>CountDisplay</code>'s climbs on every
        click, <code>IncrementButton</code>'s stays at 1 — it only reads{" "}
        <code>DispatchContext</code>, whose value (the <code>dispatch</code>{" "}
        function) never changes.
      </p>
      <CountContext value={count}>
        <DispatchContext value={dispatch}>
          <CountDisplay />
          <IncrementButton />
        </DispatchContext>
      </CountContext>
    </div>
  );
};

const CountDisplay = () => {
  const count = useContext(CountContext);
  const renders = useRef(0);
  renders.current += 1;
  return (
    <p>
      count: {count} (CountDisplay renders: {renders.current})
    </p>
  );
};

/*
 * Might feel that memo isn't required here since it receives no props.
 * But when we update count through dispatch, `SplitContext` re-renders
 * Therefore when parent updates, all child re-renders on it's own.
 * To prevent that we added memo
 */

const IncrementButton = memo(() => {
  const dispatch = useContext(DispatchContext);
  const renders = useRef(0);
  renders.current += 1;
  return (
    <div className="demo-actions">
      <button onClick={() => dispatch?.({ type: "incremented" })}>
        increment
      </button>
      <p>IncrementButton renders: {renders.current}</p>
    </div>
  );
});
