import "../hook-demo.css";
import { LazyRevealCard } from "./LazyRevealCard";

export const UseIntersectionObserverDemo = () => {
  return (
    <section>
      <h2>useIntersectionObserver</h2>
      <p>
        A custom hook (not part of the React API) that wraps the browser's{" "}
        <code>IntersectionObserver</code> API, returning a ref to attach to a
        DOM node plus whether that node currently overlaps a viewport
        (or scroll container).
      </p>
      <LazyRevealCard />
    </section>
  );
};
