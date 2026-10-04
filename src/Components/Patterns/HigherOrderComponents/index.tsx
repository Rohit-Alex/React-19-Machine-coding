import { useRef, useState, type Ref } from "react";
import { FlagsContext, withFeatureFlag, withOutline } from "./hocs";
import "../../Hooks/hook-demo.css";

const SearchBox = ({ placeholder, ref }: { placeholder: string; ref?: Ref<HTMLInputElement> }) => (
  <input ref={ref} aria-label="Search" placeholder={placeholder} />
);

// ✅ Applied once, at module level: one stable component type.
const NewSearch = withOutline(
  withFeatureFlag(SearchBox, "newSearch", () => <p style={{ fontSize: 13 }}>Old search (flag off)</p>),
  "withOutline(withFeatureFlag(SearchBox))",
);

const Parent = ({ hocInsideRender }: { hocInsideRender: boolean }) => {
  const [renders, setRenders] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // ❌ Applied inside render: a brand-new component type every render. React
  // sees a different type, throws the old one away and mounts a new one —
  // so whatever you typed is gone.
  const Search = hocInsideRender ? withOutline(SearchBox, "created inside render ❌") : NewSearch;

  return (
    <div>
      <Search ref={inputRef} placeholder="Type here, then re-render the parent" />
      <div className="demo-actions">
        <button onClick={() => setRenders((r) => r + 1)}>Re-render parent ({renders})</button>
        <button onClick={() => inputRef.current?.focus()}>Focus via ref (passes through the HOCs)</button>
      </div>
      <p style={{ fontSize: 13 }}>
        DevTools name: <code>{Search.displayName}</code>
      </p>
    </div>
  );
};

export const HigherOrderComponentsDemo = () => {
  const [newSearch, setNewSearch] = useState(true);
  const [hocInsideRender, setHocInsideRender] = useState(false);
  return (
    <section>
      <h2>Higher-order components</h2>
      <p>
        Writeup: <code>src/Components/Patterns/HigherOrderComponents/HigherOrderComponents.md</code>.
        A function that takes a component and returns a wrapped one.
      </p>
      <div className="demo-card">
        <label style={{ display: "block" }}>
          <input type="checkbox" checked={newSearch} onChange={(e) => setNewSearch(e.target.checked)} /> Feature flag{" "}
          <code>newSearch</code>
        </label>
        <label style={{ display: "block" }}>
          <input type="checkbox" checked={hocInsideRender} onChange={(e) => setHocInsideRender(e.target.checked)} /> Bug: apply
          the HOC inside render
        </label>
        <FlagsContext value={{ newSearch }}>
          <Parent hocInsideRender={hocInsideRender} />
        </FlagsContext>
      </div>
    </section>
  );
};
