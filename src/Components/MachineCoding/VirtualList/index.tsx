import { VirtualListDemo } from "./VirtualListDemo";
import "../../Hooks/hook-demo.css";

export const VirtualListSection = () => {
  return (
    <section>
      <h2>Windowed / virtualised list</h2>
      <p>
        Writeup:{" "}
        <code>src/Components/MachineCoding/VirtualList/VirtualList.md</code>.
        Only the rows you can see (plus a small buffer) are ever mounted. The
        scrollbar is faked with one tall empty div.
      </p>
      <VirtualListDemo />
    </section>
  );
};
