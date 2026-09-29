import { FlatMapComments } from "./FlatMapComments";
import { RecursiveComments } from "./RecursiveComments";
import "../../Hooks/hook-demo.css";

export const NestedCommentsDemo = () => {
  return (
    <section>
      <h2>Nested comments / threaded replies</h2>
      <p>
        Writeup:{" "}
        <code>src/Components/MachineCoding/NestedComments/NestedComments.md</code>
        . Same data, two shapes: a nested tree rendered by a component that
        renders itself, and a flat lookup table walked with a loop.
      </p>
      <RecursiveComments />
      <FlatMapComments />
    </section>
  );
};
