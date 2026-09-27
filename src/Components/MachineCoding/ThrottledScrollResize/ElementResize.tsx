import { useWindowSize } from "../../Hooks/useWindowSize/useWindowSize";
import { useResizeObserver } from "../../Hooks/useResizeObserver/useResizeObserver";

export const ElementResize = () => {
  const { ref: boxRef, size: boxSize } = useResizeObserver<HTMLDivElement>();
  const windowSize = useWindowSize();

  return (
    <div className="demo-card">
      <h4>Resize: the window is not the element</h4>
      <p>
        Drag the bottom-right corner of the grey box. Its own size updates; the
        window size does not move at all. A{" "}
        <code>window.addEventListener("resize")</code> handler would report
        nothing here, no matter how well you throttled it.
      </p>

      <div
        ref={boxRef}
        style={{
          resize: "both",
          overflow: "auto",
          minWidth: 160,
          minHeight: 80,
          width: 260,
          height: 100,
          border: "1px dashed rgba(128,128,128,0.7)",
          borderRadius: 6,
          padding: 8,
        }}
      >
        Drag my corner
      </div>

      <p>
        element:{" "}
        <strong>
          {boxSize
            ? `${Math.round(boxSize.width)} x ${Math.round(boxSize.height)}`
            : "measuring..."}
        </strong>{" "}
        · window:{" "}
        <strong>
          {windowSize.width} x {windowSize.height}
        </strong>
      </p>
      <p>
        <code>ResizeObserver</code> already batches its callbacks and delivers
        them once per frame, before paint. Throttling it on top is usually
        wasted code — and a debounce actively hurts, because the box would lag
        behind your cursor while you drag.
      </p>
    </div>
  );
};
