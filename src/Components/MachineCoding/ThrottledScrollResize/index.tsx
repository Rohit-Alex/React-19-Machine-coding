import { ElementResize } from "./ElementResize";
import { ScrollProgress } from "./ScrollProgress";
import "../../Hooks/hook-demo.css";

export const ThrottledScrollResizeDemo = () => {
  return (
    <section>
      <h2>Throttled scroll / resize handler</h2>
      <p>
        Writeup:{" "}
        <code>
          src/Components/MachineCoding/ThrottledScrollResize/ThrottledScrollResize.md
        </code>
        . The interesting part of this question is not the throttle — it is
        picking the right clock to throttle against, and noticing when the
        platform already does the job for you.
      </p>
      <ScrollProgress />
      <ElementResize />
    </section>
  );
};
