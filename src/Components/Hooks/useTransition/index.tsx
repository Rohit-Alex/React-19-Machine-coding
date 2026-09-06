import "../hook-demo.css";
import { TabSwitchTransition } from "./TabSwitchTransition";
import { ResponsiveFilter } from "./ResponsiveFilter";

export const UseTransitionDemo = () => {
  return (
    <section>
      <h2>useTransition</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useTransition/useTransition.md</code>.
        Marking a state update as low-priority so React can keep the UI
        responsive while it catches up.
      </p>
      <TabSwitchTransition />
      <ResponsiveFilter />
    </section>
  );
};
