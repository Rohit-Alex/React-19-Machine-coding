import { useCallback, useState } from "react";
import { VirtualList } from "./VirtualList";

interface Row {
  id: string;
  label: string;
}

const ROWS: Row[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: `row_${i}`,
  label: `Row ${i + 1}`,
}));

const ITEM_HEIGHT = 36;

export const VirtualListDemo = () => {
  const [bufferCount, setBufferCount] = useState(2);
  const [range, setRange] = useState({ start: 0, end: 0 });

  const handleRangeChange = useCallback(
    (start: number, end: number) => setRange({ start, end }),
    [],
  );

  return (
    <div className="demo-card">
      <h4>10,000 rows, a handful in the DOM</h4>
      <p>
        Scroll fast, then set the buffer to 0 and scroll fast again — you'll see
        blank gaps at the edges before React catches up. That gap is what the
        buffer is for.
      </p>

      <div className="demo-actions">
        <label>
          buffer rows{" "}
          <input
            type="number"
            min={0}
            max={20}
            value={bufferCount}
            onChange={(event) => setBufferCount(Number(event.target.value))}
            style={{ width: 64 }}
          />
        </label>
      </div>

      <VirtualList
        items={ROWS}
        itemHeight={ITEM_HEIGHT}
        containerHeight={320}
        bufferCount={bufferCount}
        ariaLabel="Virtualised rows"
        getKey={(row) => row.id}
        onRangeChange={handleRangeChange}
        renderItem={(row, index) => (
          <div
            style={{
              height: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              borderBottom: "1px solid rgba(128,128,128,0.2)",
              background:
                index % 2 === 0 ? "rgba(128,128,128,0.12)" : "transparent",
            }}
          >
            {row.label}
          </div>
        )}
      />

      <p>
        rendering rows {range.start + 1}–{range.end} ·{" "}
        <strong>{range.end - range.start}</strong> of{" "}
        {ROWS.length.toLocaleString()} in the DOM
      </p>
    </div>
  );
};
