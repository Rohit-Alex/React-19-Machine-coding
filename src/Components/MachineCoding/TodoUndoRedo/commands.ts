export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

/*
 * A command is plain data saying what to change. Each one has an exact
 * opposite, worked out *before* it runs (it needs the state as it was:
 * what text a todo had, where a deleted todo sat).
 */
export type Command =
  | { type: "insert"; todo: Todo; index: number }
  | { type: "remove"; id: string }
  | { type: "toggle"; id: string }
  | { type: "rename"; id: string; text: string }
  | { type: "batch"; commands: Command[] }; // Several steps undone as one.

export function apply(todos: Todo[], command: Command): Todo[] {
  switch (command.type) {
    case "insert":
      return [...todos.slice(0, command.index), command.todo, ...todos.slice(command.index)];
    case "remove":
      return todos.filter((t) => t.id !== command.id);
    case "toggle":
      return todos.map((t) => (t.id === command.id ? { ...t, done: !t.done } : t));
    case "rename":
      return todos.map((t) => (t.id === command.id ? { ...t, text: command.text } : t));
    case "batch":
      return command.commands.reduce(apply, todos);
  }
}

export function invert(todos: Todo[], command: Command): Command {
  switch (command.type) {
    case "insert":
      return { type: "remove", id: command.todo.id };
    case "remove": {
      // Remember where it was, so undo puts it back in the same place.
      const index = todos.findIndex((t) => t.id === command.id);
      return { type: "insert", todo: todos[index], index };
    }
    case "toggle":
      return command; // Toggling twice is a no-op.
    case "rename":
      return { type: "rename", id: command.id, text: todos.find((t) => t.id === command.id)!.text };
    case "batch": {
      // Undo the steps in reverse order, each inverted against the state it
      // ran on.
      const inverses: Command[] = [];
      let state = todos;
      for (const step of command.commands) {
        inverses.unshift(invert(state, step));
        state = apply(state, step);
      }
      return { type: "batch", commands: inverses };
    }
  }
}

interface Entry {
  label: string;
  redo: Command;
  undo: Command;
}

export interface HistoryState {
  todos: Todo[];
  past: Entry[]; // newest last
  future: Entry[]; // next redo last
}

export type HistoryAction = { type: "run"; label: string; command: Command } | { type: "undo" } | { type: "redo" };

const LIMIT = 100;

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "run": {
      const entry = { label: action.label, redo: action.command, undo: invert(state.todos, action.command) };
      return {
        todos: apply(state.todos, action.command),
        past: [...state.past, entry].slice(-LIMIT),
        future: [], // A new action after undoing makes the old redo list meaningless.
      };
    }
    case "undo": {
      const entry = state.past.at(-1);
      if (!entry) return state;
      return { todos: apply(state.todos, entry.undo), past: state.past.slice(0, -1), future: [...state.future, entry] };
    }
    case "redo": {
      const entry = state.future.at(-1);
      if (!entry) return state;
      return { todos: apply(state.todos, entry.redo), past: [...state.past, entry], future: state.future.slice(0, -1) };
    }
  }
}
