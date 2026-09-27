import { useRef, useState } from "react";

/**
 * Scenario 5: refs for a mapped list. You can't call useRef inside .map()
 * (rules of hooks), so keep ONE ref holding a Map<id, node> and let each
 * item's callback ref add itself and (React 19) return a cleanup that removes it.
 */
export const RefList = () => {
  const [items, setItems] = useState(() =>
    Array.from({ length: 8 }, (_, i) => i),
  );
  const [mapSize, setMapSize] = useState<number | null>(null);

  // Lazy init (same guard as scenario 3) — `useRef(new Map())` would build
  // a throwaway Map every render.
  const nodesRef = useRef<Map<number, HTMLLIElement> | null>(null);
  const getMap = () => {
    if (nodesRef.current === null) nodesRef.current = new Map();
    return nodesRef.current;
  };

  const scrollTo = (id: number) => {
    getMap().get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="demo-card">
      <h4>5. Refs for a dynamically mapped list</h4>
      <p>
        One <code>useRef</code> holds a <code>Map</code> of id → node. Remove an
        item and check the size: the cleanup returned from the callback ref
        deleted its entry, so no stale node is left behind.
      </p>
      <div className="demo-actions">
        {items.map((id) => (
          <button key={id} onClick={() => scrollTo(id)}>
            #{id}
          </button>
        ))}
      </div>
      <div className="demo-actions">
        <button
          onClick={() => setItems((xs) => [...xs, (xs.at(-1) ?? -1) + 1])}
        >
          add item
        </button>
        <button onClick={() => setItems((xs) => xs.slice(0, -1))}>
          remove last
        </button>
        <button onClick={() => setMapSize(getMap().size)}>read Map size</button>
      </div>
      <p>
        items: {items.length} · Map size: {mapSize ?? "—"}
      </p>
      <ul style={{ maxHeight: 120, overflow: "auto" }}>
        {items.map((id) => (
          <li
            key={id}
            ref={(node) => {
              if (!node) return;
              const map = getMap();
              map.set(id, node);
              return () => {
                map.delete(id);
              };
            }}
            style={{ padding: "12px 0" }}
          >
            item #{id}
          </li>
        ))}
      </ul>
    </div>
  );
};
