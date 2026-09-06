import "../hook-demo.css";
import { FormattedTimestamp } from "./FormattedTimestamp";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";

export const UseDebugValueDemo = () => {
  return (
    <section>
      <h2>useDebugValue</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useDebugValue/useDebugValue.md</code>.
        Labels a custom hook's internal value in React DevTools — it has no
        effect on what's rendered, only on what you see when inspecting a
        component's hooks in the browser extension.
      </p>
      <OnlineStatusIndicator />
      <FormattedTimestamp />
    </section>
  );
};
