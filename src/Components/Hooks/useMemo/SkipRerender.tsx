import { memo, useMemo, useState } from "react";

interface ITodo {
  id: number;
  text: string;
  done: boolean;
}

type Tab = "all" | "active" | "completed";

const allTodos: ITodo[] = [
  { id: 1, text: "Buy groceries", done: true },
  { id: 2, text: "Walk the dog", done: false },
  { id: 3, text: "Write interview notes", done: false },
  { id: 4, text: "Ship the PR", done: true },
];

function filterTodos(todos: ITodo[], tab: Tab) {
  console.log("[filterTodos] recalculating...");
  if (tab === "active") return todos.filter((t) => !t.done);
  if (tab === "completed") return todos.filter((t) => t.done);
  return todos;
}

/**
 * Scenario 2: Skipping re-rendering of a child component.
 * `useMemo` alone only gives a stable reference — it's `memo` on `List`
 * that actually skips the re-render when that reference doesn't change.
 */
export const SkipRerender = () => {
  const [tab, setTab] = useState<Tab>("all");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const visibleTodos = useMemo(() => filterTodos(allTodos, tab), [tab]);

  return (
    <div className="demo-card">
      <h4>2. Skipping re-rendering of a child component</h4>
      <p>Open the console. Toggling theme should not re-render the list below.</p>
      <div className="demo-actions">
        <button onClick={() => setTab("all")}>all</button>
        <button onClick={() => setTab("active")}>active</button>
        <button onClick={() => setTab("completed")}>completed</button>
        <button
          onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        >
          toggle theme ({theme})
        </button>
      </div>
      <List items={visibleTodos} />
    </div>
  );
};

const List = memo(({ items }: { items: ITodo[] }) => {
  console.log("[List] rendering");
  return (
    <ul>
      {items.map((todo) => (
        <li key={todo.id}>
          {todo.done ? "✅" : "⬜️"} {todo.text}
        </li>
      ))}
    </ul>
  );
});
