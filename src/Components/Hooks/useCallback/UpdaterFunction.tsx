import { useCallback, useState } from "react";

interface ITodo {
  id: number;
  text: string;
}

let nextId = 1;

// 🔴 Classic stale-closure trap (not executed — see comment below):
//
//   const handleAdd = useCallback(() => {
//     setTodos([...todos, { id: nextId++, text }]); // reads `todos` directly
//   }, []); // forgot `todos` in deps — this closure is now stuck forever
//           // pointing at the `todos` array from the FIRST render, so every
//           // add after the first silently drops earlier items.
//
// The updater-function form below sidesteps this: React always hands the
// updater the CURRENT state, so `todos` never needs to be a dependency —
// there's no closure to go stale.

/**
 * Scenario 1: Updating state from a memoized callback.
 * `handleAddTodo` only depends on `text` (read directly), never `todos` —
 * the updater form of setTodos always sees the latest state.
 */
export const UpdaterFunction = () => {
  const [todos, setTodos] = useState<ITodo[]>([]);
  const [text, setText] = useState("");

  const handleAddTodo = useCallback(() => {
    setTodos((prev) => [...prev, { id: nextId++, text }]);
    setText("");
  }, [text]);

  return (
    <div className="demo-card">
      <h4>1. Updating state from a memoized callback</h4>
      <p>
        <code>handleAddTodo</code> never lists <code>todos</code> as a
        dependency — the updater function reads the latest state itself.
      </p>
      <div className="demo-actions">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="new todo"
        />
        <button onClick={handleAddTodo}>add</button>
      </div>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
};
