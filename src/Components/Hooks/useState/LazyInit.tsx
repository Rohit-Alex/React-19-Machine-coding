import { useState } from "react";

function createInitialTodos() {
  console.log("[LazyInit] createInitialTodos() ran");
  const todos = [];
  for (let i = 0; i < 5; i++) {
    todos.push(`todo #${i}`);
  }
  return todos;
}

/**
 * Scenario 1: Lazy initialization.
 * Passing `createInitialTodos` (the function) means it only runs once, at
 * mount. Typing into the input re-renders this component on every
 * keystroke, but the log line never fires again.
 */
export const LazyInit = () => {
  const [todos] = useState(createInitialTodos);
  const [text, setText] = useState("");

  return (
    <div className="demo-card">
      <h4>1. Lazy initialization</h4>
      <p>
        Open the console. Typing below re-renders this component, but{" "}
        <code>createInitialTodos()</code> never logs again after mount.
      </p>
      <div className="demo-actions">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="type to force re-renders"
        />
      </div>
      <p>{todos.length} todos, created once</p>
    </div>
  );
};
