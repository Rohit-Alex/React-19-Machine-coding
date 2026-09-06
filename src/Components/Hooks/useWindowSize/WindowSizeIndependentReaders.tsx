import { useWindowSizeWithState } from "./useWindowSizeWithState";

const Reader = ({ label }: { label: string }) => {
  const { width, height } = useWindowSizeWithState();

  return (
    <li>
      {label}: {width}px x {height}px
    </li>
  );
};

export const WindowSizeIndependentReaders = () => {
  return (
    <div>
      <h3>The issue: a plain useState-backed version</h3>
      <p>
        Each <code>Reader</code> below calls{" "}
        <code>useWindowSizeWithState()</code> — the original hook. It doesn't
        have useLocalStorage's kind of bug: every instance reads the real{" "}
        <code>window.innerWidth</code>/<code>innerHeight</code> directly, so
        resize the window and all three still show the same numbers. What you
        can't see is the cost: three instances means three separate{" "}
        <code>useState</code>s, three separate <code>resize</code> listeners,
        and three freshly-built <code>{"{ width, height }"}</code> objects
        per resize. Because each instance updates on its own, React's
        concurrent rendering can interrupt one instance's re-render before
        another's has committed — briefly "tearing" the view across a stale
        and a fresh value. It's rare to see with plain resizing, but it's the
        real risk this hook carries.
      </p>
      <ul>
        <Reader label="Reader A" />
        <Reader label="Reader B" />
        <Reader label="Reader C" />
      </ul>
    </div>
  );
};
