import "../hook-demo.css";
import { NestedHandles } from "./NestedHandles";
import { PreferPropsOverRefs } from "./PreferPropsOverRefs";
import { RestrictedHandle } from "./RestrictedHandle";

export const UseImperativeHandleDemo = () => {
  return (
    <section>
      <h2>useImperativeHandle</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useImperativeHandle/useImperativeHandle.md</code>.
        For customizing the ref handle a component exposes to its parent —
        instead of handing out a raw DOM node or instance, expose a
        constrained set of methods.
      </p>
      <RestrictedHandle />
      <NestedHandles />
      <PreferPropsOverRefs />
    </section>
  );
};
