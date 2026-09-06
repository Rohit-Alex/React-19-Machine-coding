import "../hook-demo.css";
import { OptimisticMessageThread } from "./OptimisticMessageThread";
import { ToggleLikeButton } from "./ToggleLikeButton";

export const UseOptimisticDemo = () => {
  return (
    <section>
      <h2>useOptimistic</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useOptimistic/useOptimistic.md</code>.
        Renders an "optimistic" version of state that's automatically reset
        once an Action finishes or reverted if it errors — without
        hand-rolling fake state plus a manual rollback.
      </p>
      <ToggleLikeButton />
      <OptimisticMessageThread />
    </section>
  );
};
