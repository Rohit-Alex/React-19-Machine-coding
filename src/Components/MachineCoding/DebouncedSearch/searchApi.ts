export interface SearchResult {
  id: number;
  name: string;
  category: string;
}

export const CATALOG: SearchResult[] = [
  { id: 1, name: "React", category: "UI library" },
  { id: 2, name: "React Router", category: "Routing" },
  { id: 3, name: "React Query", category: "Data fetching" },
  { id: 4, name: "React Hook Form", category: "Forms" },
  { id: 5, name: "Redux Toolkit", category: "State" },
  { id: 6, name: "Recoil", category: "State" },
  { id: 7, name: "Remix", category: "Framework" },
  { id: 8, name: "Preact", category: "UI library" },
  { id: 9, name: "Svelte", category: "UI library" },
  { id: 10, name: "Solid", category: "UI library" },
  { id: 11, name: "Vue", category: "UI library" },
  { id: 12, name: "Angular", category: "Framework" },
  { id: 13, name: "Next.js", category: "Framework" },
  { id: 14, name: "Nuxt", category: "Framework" },
  { id: 15, name: "Vite", category: "Build tool" },
  { id: 16, name: "Rollup", category: "Build tool" },
  { id: 17, name: "Webpack", category: "Build tool" },
  { id: 18, name: "esbuild", category: "Build tool" },
  { id: 19, name: "Zustand", category: "State" },
  { id: 20, name: "Jotai", category: "State" },
  { id: 21, name: "TanStack Table", category: "Tables" },
  { id: 22, name: "Zod", category: "Validation" },
  { id: 23, name: "Playwright", category: "Testing" },
  { id: 24, name: "Vitest", category: "Testing" },
];

// Shorter queries are deliberately slower. A real backend behaves this way too
// (broader query, more rows to scan), and it makes the out-of-order response
// race reproducible on every run instead of once in a hundred.
function latencyFor(query: string): number {
  return Math.max(150, 1500 - query.length * 300);
}

export function searchCatalog(
  query: string,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();

    const timer = setTimeout(() => {
      const needle = query.toLowerCase();
      resolve(
        CATALOG.filter((item) => item.name.toLowerCase().includes(needle)),
      );
    }, latencyFor(query));

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
