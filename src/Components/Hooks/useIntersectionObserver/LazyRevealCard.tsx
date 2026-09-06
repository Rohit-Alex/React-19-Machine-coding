import { useIntersectionObserver } from "./useIntersectionObserver";

export const LazyRevealCard = () => {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.5,
  });

  return (
    <div>
      <h3>Revealing a card as it enters the viewport</h3>
      <p>
        The card below sits 400px down inside a 150px-tall scroll container.
        <code>useIntersectionObserver</code> reports whether at least half of
        it is currently visible, without attaching a single scroll listener —
        the browser's <code>IntersectionObserver</code> does the watching.
      </p>
      <div
        style={{
          height: 150,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "0 1rem",
        }}
      >
        <div style={{ height: 400 }}>
          <p>Scroll down to reveal the card.</p>
        </div>
        <div
          ref={ref}
          style={{
            padding: "1rem",
            border: "1px solid #ccc",
            background: isIntersecting ? "#d1fae5" : "#f3f4f6",
            transition: "background 0.2s",
          }}
        >
          {isIntersecting ? "I'm visible now!" : "Scroll me into view..."}
        </div>
        <div style={{ height: 200 }} />
      </div>
      <p>Currently intersecting: {String(isIntersecting)}</p>
    </div>
  );
};
