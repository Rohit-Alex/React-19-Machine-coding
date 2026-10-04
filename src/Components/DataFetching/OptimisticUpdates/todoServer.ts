import { wait } from "../RaceConditions/fakeApi";

export interface Todo {
  id: string; // Made by the client, so the optimistic row and the saved row share a key.
  text: string;
  done: boolean;
}

export type TodoAction =
  | { type: "add"; todo: Todo }
  | { type: "setDone"; id: string; done: boolean } // "set to true", not "flip"
  | { type: "remove"; id: string };

/**
 * Pure: used by the server to save, and by the client to predict. Same rule
 * both sides. Every action is safe to apply twice — an optimistic copy can
 * be laid over a list that already contains the saved change.
 */
export function applyAction(todos: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case "add":
      return todos.some((t) => t.id === action.todo.id) ? todos : [...todos, action.todo];
    case "setDone":
      return todos.map((t) => (t.id === action.id ? { ...t, done: action.done } : t));
    case "remove":
      return todos.filter((t) => t.id !== action.id);
  }
}

const SEED: Todo[] = [
  { id: "1", text: "Buy milk", done: false },
  { id: "2", text: "Call the bank (will fail)", done: false },
  { id: "3", text: "Pay rent", done: true },
];

/*
 * One fake server per demo panel. Any change touching a todo with "fail" in
 * its text is rejected — and rejected *slowly* (1.5s vs 0.5s), which is what
 * makes the rollback bug in section 3 of the writeup reproducible.
 */
export function createTodoServer() {
  let todos = SEED;
  const listeners = new Set<() => void>();

  const textOf = (action: TodoAction) =>
    action.type === "add" ? action.todo.text : (todos.find((t) => t.id === action.id)?.text ?? "");

  return {
    getTodos: () => todos,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async save(action: TodoAction): Promise<Todo[]> {
      const willFail = /fail/i.test(textOf(action));
      await wait(willFail ? 1500 : 500);
      if (willFail) throw new Error(`Couldn't save “${textOf(action)}”`);
      todos = applyAction(todos, action);
      listeners.forEach((l) => l());
      return todos;
    },
  };
}

export type TodoServer = ReturnType<typeof createTodoServer>;
