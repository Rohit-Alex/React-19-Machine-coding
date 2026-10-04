import { RaceDemo } from "./RaceDemo";
import { TimeoutDemo } from "./TimeoutDemo";
import "../../Hooks/hook-demo.css";

export const RaceConditionsDemo = () => (
  <section>
    <h2>Race conditions &amp; request cancellation</h2>
    <p>
      Writeup: <code>src/Components/DataFetching/RaceConditions/RaceConditions.md</code>. Answers
      arrive in any order; the last request you made is not always the last to answer.
    </p>
    <RaceDemo />
    <TimeoutDemo />
  </section>
);
