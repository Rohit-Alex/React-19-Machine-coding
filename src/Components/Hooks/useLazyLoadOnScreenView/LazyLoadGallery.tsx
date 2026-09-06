import { useLazyLoadOnScreenView } from "./useLazyLoadOnScreenView";

const LazyCard = ({ label }: { label: string }) => {
  const { ref, shouldLoad } = useLazyLoadOnScreenView<HTMLDivElement>({
    rootMargin: "50px",
  });

  return (
    <div
      ref={ref}
      style={{
        height: 120,
        marginBottom: 16,
        border: "1px solid #ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: shouldLoad ? "#dbeafe" : "#f3f4f6",
      }}
    >
      {shouldLoad ? `${label} — loaded` : `${label} — skeleton`}
    </div>
  );
};

export const LazyLoadGallery = () => {
  return (
    <div>
      <h3>Loading content only as it nears the viewport</h3>
      <p>
        Each card below starts as a skeleton. <code>useLazyLoadOnScreenView</code>{" "}
        (which composes <code>useIntersectionObserver</code> with a{" "}
        <code>rootMargin</code> to trigger a bit early, and{" "}
        <code>freezeOnceVisible</code> so it never reverts) flips it to
        "loaded" once it's about to scroll into view — and it stays loaded
        even after scrolling past.
      </p>
      <div
        style={{
          height: 200,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "0 1rem",
        }}
      >
        <LazyCard label="Card 1" />
        <LazyCard label="Card 2" />
        <LazyCard label="Card 3" />
        <LazyCard label="Card 4" />
        <LazyCard label="Card 5" />
      </div>
    </div>
  );
};
