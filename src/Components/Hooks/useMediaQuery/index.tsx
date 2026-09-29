import { MediaQueryDisplay } from "./MediaQueryDisplay";
import "../hook-demo.css";

export const UseMediaQueryDemo = () => {
  return (
    <section>
      <h2>useMediaQuery</h2>
      <p>
        Subscribes to <code>window.matchMedia(query)</code> and its{" "}
        <code>change</code> event via <code>useSyncExternalStore</code>. Unlike{" "}
        <code>useWindowSize</code>, it re-renders only when the answer flips,
        not on every pixel of a resize.
      </p>
      <MediaQueryDisplay />
    </section>
  );
};
