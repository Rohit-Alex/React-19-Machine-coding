export interface User {
  id: number;
  name: string;
  role: string;
}

const USERS: User[] = [
  { id: 1, name: "Asha Rao", role: "Engineering manager" },
  { id: 2, name: "Ben Okafor", role: "Designer" },
  { id: 3, name: "Chen Wei", role: "Backend engineer" },
  { id: 4, name: "Diya Patel", role: "Product manager" },
  { id: 5, name: "Erik Lund", role: "Frontend engineer" },
];

/**
 * A sleep that can be cancelled — the pattern for making *any* async work
 * abortable, not just fetch.
 */
export function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted(); // Already cancelled: don't start at all.
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(signal!.reason); // Same as fetch: reject with the signal's reason.
    };
    const timeoutId = setTimeout(() => {
      // Remove the listener when we finish normally. A signal that lives for
      // the whole component would otherwise collect one listener per call.
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/*
 * Lower ids answer more slowly (user 1: 1.8s … user 5: 0.2s), so clicking
 * 1 then 5 reproduces the race every time instead of once in a while.
 */
export async function fetchUser(id: number, signal?: AbortSignal): Promise<User> {
  await wait(2200 - id * 400, signal);
  return USERS.find((u) => u.id === id)!;
}

export const USER_IDS = USERS.map((u) => u.id);

/** A slow endpoint for the timeout demo: always 2 seconds. */
export async function fetchReport(signal?: AbortSignal) {
  await wait(2000, signal);
  return { rows: 1284, generatedAt: new Date().toLocaleTimeString() };
}
