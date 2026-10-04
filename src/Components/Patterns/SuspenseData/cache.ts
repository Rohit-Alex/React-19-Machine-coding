import { wait } from "../../DataFetching/RaceConditions/fakeApi";

export interface User {
  id: number;
  name: string;
}
export interface Post {
  id: string;
  title: string;
}

const NAMES = ["Asha Rao", "Ben Okafor", "Chen Wei"];

/*
 * use(promise) needs the SAME promise on every render. A promise made during
 * render is new each time, so React would suspend forever. So: a cache, one
 * promise per key, made once and reused. (Libraries — TanStack Query,
 * Relay, framework loaders — are this cache, done properly.)
 */
const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as Promise<T>;
}

/** Forget everything — a "refresh". Also how a retry after an error works. */
export const clearCache = () => cache.clear();

export const getUser = (id: number) =>
  cached(`user-${id}`, async () => {
    await wait(800);
    return { id, name: NAMES[id - 1] } satisfies User;
  });

export const getPosts = (id: number) =>
  cached(`posts-${id}`, async () => {
    await wait(1200);
    // User 3's posts always fail, to show the error boundary.
    if (id === 3) throw new Error("Couldn't load posts for this user");
    return Array.from({ length: 3 }, (_, i) => ({ id: `${id}-${i}`, title: `${NAMES[id - 1].split(" ")[0]}'s post #${i + 1}` })) satisfies Post[];
  });
