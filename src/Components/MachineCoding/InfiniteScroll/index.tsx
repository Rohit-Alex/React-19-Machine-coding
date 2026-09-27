import { InfiniteFeed } from "./InfiniteFeed";
import "../../Hooks/hook-demo.css";

export const InfiniteScrollDemo = () => {
  return (
    <section>
      <h2>Infinite scroll list</h2>
      <p>
        Writeup:{" "}
        <code>
          src/Components/MachineCoding/InfiniteScroll/InfiniteScroll.md
        </code>
        . The observer is the easy part. The marks are in cursor pagination,
        not double-fetching, and leaving a real button behind for people who
        do not use a mouse.
      </p>
      <InfiniteFeed />
    </section>
  );
};
