import "../hook-demo.css";
import { LazyLoadGallery } from "./LazyLoadGallery";

export const UseLazyLoadOnScreenViewDemo = () => {
  return (
    <section>
      <h2>useLazyLoadOnScreenView</h2>
      <p>
        A custom hook (not part of the React API) built on top of{" "}
        <code>useIntersectionObserver</code> that defers loading content
        until it's about to scroll into view, then keeps it loaded — the
        pattern behind lazy-loaded images and infinite lists.
      </p>
      <LazyLoadGallery />
    </section>
  );
};
