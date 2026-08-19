import { useReducer, useState } from "react";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

type Action =
  | { type: "added"; text: string }
  | { type: "toggled"; id: number }
  | { type: "deleted"; id: number };

function todosReducer(todos: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "added": {
      return [...todos, { id: Date.now(), text: action.text, done: false }];
    }
    case "toggled": {
      return todos.map((t) =>
        t.id === action.id ? { ...t, done: !t.done } : t,
      );
    }
    case "deleted": {
      return todos.filter((t) => t.id !== action.id);
    }
    default: {
      throw new Error(`Unknown action: ${JSON.stringify(action)}`);
    }
  }
}

/**
 * Scenario 1: the canonical reducer — add/toggle/delete over an array,
 * every branch returning a new array/object instead of mutating.
 */
export const TodoReducer = () => {
  const [todos, dispatch] = useReducer(todosReducer, []);
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (!text.trim()) return;
    dispatch({ type: "added", text });
    setText("");
  };

  return (
    <div className="demo-card">
      <h4>1. Todo reducer: add / toggle / delete</h4>
      <p>
        One <code>dispatch</code> call per action, all update logic lives in{" "}
        <code>todosReducer</code> instead of three separate handlers.
      </p>
      <div className="demo-actions">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="new todo"
        />
        <button onClick={handleAdd}>add</button>
      </div>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            <label style={{ textDecoration: t.done ? "line-through" : "none" }}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => dispatch({ type: "toggled", id: t.id })}
              />
              {t.text}
            </label>{" "}
            <button onClick={() => dispatch({ type: "deleted", id: t.id })}>
              delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
