import { useState, type ReactNode } from "react";

/*
 * Where render props still win: the component owns per-item state (which row
 * is hovered / active) and lets the caller draw each row with it. A hook
 * would have to hand back "prop getters" for every row to do the same.
 * Same shape as react-window's rowComponent, or a Select's renderOption.
 */
export function HoverList<T>({
  items,
  getKey,
  renderItem,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, state: { isHovered: boolean }) => ReactNode;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <ul style={{ listStyle: "none", padding: 0 }} onPointerLeave={() => setHovered(null)}>
      {items.map((item) => (
        <li key={getKey(item)} onPointerEnter={() => setHovered(getKey(item))} style={{ padding: "4px 0" }}>
          {renderItem(item, { isHovered: hovered === getKey(item) })}
        </li>
      ))}
    </ul>
  );
}
