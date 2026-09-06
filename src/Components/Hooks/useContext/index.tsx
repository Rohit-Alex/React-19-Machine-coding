import "../hook-demo.css";
import { ThemeDrilling } from "./ThemeDrilling";
import { SplitContext } from "./SplitContext";

export const UseContextDemo = () => {
  return (
    <section>
      <h2>useContext</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useContext/useContext.md</code>. Passing
        data deeply, the closest-provider-wins override rule, and why
        splitting a context can save unnecessary re-renders.
      </p>
      <ThemeDrilling />
      <SplitContext />
    </section>
  );
};
